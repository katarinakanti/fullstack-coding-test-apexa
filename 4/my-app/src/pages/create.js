import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import { Card, Alert } from "flowbite-react";
import { Button, Label, TextInput } from "flowbite-react";
import Link from "next/link";
import { authApi, structureApi } from '../services/api';

const inter = Inter({ subsets: ['latin'] })

// Function to build tree structure from nodes
const buildTree = (nodes) => {
  if (!nodes || nodes.length === 0) return null;
  
  const nodeMap = {};
  const labelToNodeMap = {};
  const roots = [];

  // First pass: create all nodes and map them by both index and label
  nodes.forEach((n, index) => {
    const nodeId = index + 1; // Use 1-based indexing for user-friendly references
    const nodeData = { 
      ...n, 
      id: nodeId,
      children: [],
      label: n.label.toString() || `Node ${nodeId}`
    };
    nodeMap[nodeId] = nodeData;
    labelToNodeMap[n.label.toString()] = nodeData;
  });

  // Second pass: build parent-child relationships by matching parent labels and identify roots
  nodes.forEach((n, index) => {
    const nodeId = index + 1;
    const currentNode = nodeMap[nodeId];
    
    // Check if this node has a parent by looking up the parent label
    if (n.parent_id && n.parent_id.toString().trim() !== '' && labelToNodeMap[n.parent_id.toString()]) {
      // This node has a valid parent, add it as a child to the parent node
      labelToNodeMap[n.parent_id.toString()].children.push(currentNode);
    } else {
      // This node has no parent or invalid parent, it's a root
      roots.push(currentNode);
    }
  });

  // Return the first root, or create a virtual root if multiple roots exist
  if (roots.length === 1) {
    return roots[0];
  } else if (roots.length > 1) {
    // Multiple roots - create a virtual root
    return {
      id: 'virtual-root',
      label: 'Root',
      children: roots
    };
  }
  
  return null;
};

export default function CreateStructure() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [formData, setFormData] = useState({
    label: '',
    nodes: [{ label: '', parent_id: null }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is authenticated
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  // Update tree visualization when nodes change
  useEffect(() => {
    if (canvasRef.current) {
      drawTree(canvasRef.current, formData.nodes);
    }
  }, [formData.nodes]);

  const drawTree = (canvas, nodes) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Filter out empty nodes
    const validNodes = nodes.filter(node => node.label.trim() !== '');
    if (validNodes.length === 0) {
      // Draw placeholder text
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillText('Add nodes to see preview', canvas.width / 2, canvas.height / 2);
      return;
    }

    const treeData = buildTree(validNodes);
    if (!treeData) return;

    const nodeRadius = 20;
    const horizontalSpacing = 80;
    const verticalSpacing = 60;

    // Calculate tree dimensions for better positioning
    const getTreeWidth = (node) => {
      if (!node.children || node.children.length === 0) return 1;
      return node.children.reduce((sum, child) => sum + getTreeWidth(child), 0);
    };

    const traverseAndDraw = (node, x, y, level) => {
      // Skip virtual root drawing
      if (node.id === 'virtual-root') {
        // Just draw children
        if (node.children.length > 0) {
          const totalWidth = node.children.length * horizontalSpacing;
          const startX = canvas.width / 2 - totalWidth / 2;
          
          node.children.forEach((child, index) => {
            const childX = startX + (index + 0.5) * horizontalSpacing;
            traverseAndDraw(child, childX, y, level);
          });
        }
        return;
      }

      // Draw the node circle
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#2563eb';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      
      // Draw the node label
      ctx.fillStyle = '#1e3a8a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '14px sans-serif';
      
      // Truncate long labels
      const displayLabel = node.label.length > 8 ? node.label.slice(0, 6) + '..' : node.label;
      ctx.fillText(displayLabel, x, y);

      // Draw lines to children
      if (node.children && node.children.length > 0) {
        const childrenWidth = (node.children.length - 1) * horizontalSpacing;
        const childStartX = x - childrenWidth / 2;

        node.children.forEach((child, index) => {
          const childX = childStartX + index * horizontalSpacing;
          const childY = y + verticalSpacing;
          
          // Draw line from parent to child
          ctx.beginPath();
          ctx.moveTo(x, y + nodeRadius);
          ctx.lineTo(childX, childY - nodeRadius);
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 2;
          ctx.stroke();

          traverseAndDraw(child, childX, childY, level + 1);
        });
      }
    };

    // Start drawing from the center-top of canvas
    traverseAndDraw(treeData, canvas.width / 2, 50, 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNodeChange = (index, field, value) => {
    const updatedNodes = [...formData.nodes];
    updatedNodes[index] = {
      ...updatedNodes[index],
      [field]: field === 'parent_id' && value === '' ? null : value
    };
    setFormData(prev => ({
      ...prev,
      nodes: updatedNodes
    }));
  };

  const addNode = () => {
    setFormData(prev => ({
      ...prev,
      nodes: [...prev.nodes, { label: '', parent_id: null }]
    }));
  };

  const removeNode = (index) => {
    if (formData.nodes.length > 1) {
      const updatedNodes = formData.nodes.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        nodes: updatedNodes
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate that all nodes have labels
      const hasEmptyNodes = formData.nodes.some(node => !node.label.trim());
      if (hasEmptyNodes) {
        setError('All nodes must have a label');
        setLoading(false);
        return;
      }

      const result = await structureApi.create(formData);
      
      if (result.success) {
        router.push('/structure');
      } else {
        setError(result.error || 'Failed to create structure');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/');
  };

  return (
    <>
      <Navbar fluid rounded className="mb-8">
        <NavbarBrand as={Link} href="/structure">
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Create Structure</span>
        </NavbarBrand>
        <NavbarToggle />
        <NavbarCollapse>
          <NavbarLink as={Link} href="/structure" className="font-semibold text-gray-900">
            Back to My Work
          </NavbarLink>
          <NavbarLink 
            onClick={handleLogout}
            className="font-semibold text-red-500 hover:text-red-700 cursor-pointer"
          >
            Logout
          </NavbarLink>
        </NavbarCollapse>
      </Navbar>

      <div className="container mx-auto p-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
          {/* Form Section */}
          <Card className="w-full lg:w-1/2">
            <h2 className="text-xl font-bold mb-4">Node and Parent Configuration</h2>
            
            {error && (
              <Alert color="failure" className="mb-4">
                {error}
              </Alert>
            )}

            <div className="mb-6">
              <div className="mb-2 block">
                <Label htmlFor="label">Structure Name</Label>
              </div>
              <TextInput 
                id="label" 
                name="label"
                type="text" 
                placeholder="Enter structure name" 
                required 
                value={formData.label}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            
            <form className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <Label className="font-medium">Node</Label>
                <Label className="font-medium">Parent</Label>
              </div>

              {formData.nodes.map((node, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <TextInput 
                      type="text" 
                      placeholder="Node name" 
                      required 
                      value={node.label}
                      onChange={(e) => handleNodeChange(index, 'label', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-1">
                    <TextInput 
                      type="text" 
                      placeholder="Parent node" 
                      value={node.parent_id || ''}
                      onChange={(e) => handleNodeChange(index, 'parent_id', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  {formData.nodes.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      color="failure"
                      onClick={() => removeNode(index)}
                      disabled={loading}
                    >
                      -
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                color="gray"
                onClick={addNode}
                disabled={loading}
                className="w-full"
              >
                + Add
              </Button>
            </form>
          </Card>

          {/* Tree Visualization Section */}
          <Card className="w-full lg:w-1/2">
            <div className="flex justify-center mb-4">
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={300} 
                className="border rounded-lg bg-gray-50"
              />
            </div>
            <div className="flex justify-center gap-4">
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white px-8 py-2 rounded w-full"
              >
                {loading ? 'Creating...' : 'Save'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
