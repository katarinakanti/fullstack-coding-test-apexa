import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import { Card, Alert, Spinner } from "flowbite-react";
import { Button } from "flowbite-react";
import Link from "next/link";
import { authApi, structureApi } from '../services/api';

const inter = Inter({ subsets: ['latin'] })

// Function to build tree structure from nodes
const buildTree = (nodes) => {
  if (!nodes || nodes.length === 0) return null;
  
  // Debug: Log the received nodes data
  console.log('buildTree received nodes:', nodes);
  
  const nodeMap = {};
  const roots = [];

  // First pass: create all nodes and map them by their actual ID
  nodes.forEach((n) => {
    console.log(`Processing node: ${n.label} (ID: ${n.id}, parent_id: ${n.parent_id})`);
    nodeMap[n.id] = { 
      ...n, 
      children: [],
      label: n.label.toString()
    };
  });

  console.log('nodeMap after first pass:', nodeMap);

  // Second pass: build parent-child relationships and identify roots
  nodes.forEach((n) => {
    const currentNode = nodeMap[n.id];
    
    console.log(`Building relationships for ${n.label}: parent_id=${n.parent_id}, parent exists=${!!nodeMap[n.parent_id]}`);
    
    if (n.parent_id && nodeMap[n.parent_id]) {
      // This node has a valid parent, add it as a child
      nodeMap[n.parent_id].children.push(currentNode);
      console.log(`Added ${n.label} as child of ${nodeMap[n.parent_id].label}`);
    } else {
      // This node has no parent or invalid parent, it's a root
      roots.push(currentNode);
      console.log(`${n.label} is a root node`);
    }
  });

  console.log('Final roots:', roots);
  console.log('Final nodeMap:', nodeMap);

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

// Tree visualization component
const TreeCanvas = ({ structure, onEdit, onDelete }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && structure.nodes) {
      drawTree(canvasRef.current, structure);
    }
  }, [structure]);

  const drawTree = (canvas, structure) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const treeData = buildTree(structure.nodes);
    if (!treeData) return;

    const nodeRadius = 15;
    const horizontalSpacing = 60;
    const verticalSpacing = 50;

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
      ctx.font = '12px sans-serif';
      
      // Truncate long labels
      const displayLabel = node.label.length > 6 ? node.label.slice(0, 4) + '..' : node.label;
      ctx.fillText(displayLabel, x, y);

      // Draw lines to children
      if (node.children && node.children.length > 0) {
        const totalChildrenWidth = (node.children.length - 1) * horizontalSpacing;
        const childStartX = x - totalChildrenWidth / 2;

        node.children.forEach((child, index) => {
          const childX = childStartX + index * horizontalSpacing;
          const childY = y + verticalSpacing;
          
          // Draw line from parent to child
          ctx.beginPath();
          ctx.moveTo(x, y + nodeRadius);
          ctx.lineTo(childX, childY - nodeRadius);
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1;
          ctx.stroke();

          traverseAndDraw(child, childX, childY, level + 1);
        });
      }
    };

    // Start drawing from the center-top of canvas
    traverseAndDraw(treeData, canvas.width / 2, 30, 0);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="text-center mb-3">
        <h3 className="text-lg font-medium">{structure.label}</h3>
        <p className="text-sm text-gray-600">{structure.nodes?.length || 0} nodes</p>
      </div>
      
      <div className="flex justify-center mb-3">
        <canvas 
          ref={canvasRef} 
          width={250} 
          height={200} 
          className="border rounded-lg bg-gray-50"
        />
      </div>
      
      <div className="flex gap-2 justify-center">
        <Button 
          size="sm"
          onClick={() => onEdit(structure.id)}
        >
          View
        </Button>
        <Button 
          size="sm" 
          color="failure"
          onClick={() => onDelete(structure.id)}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
};

export default function Structure() {
  const router = useRouter();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is authenticated
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
      return;
    }
    
    fetchStructures();
  }, [router]);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      const result = await structureApi.getAll();
      
      console.log('API result:', result); // Debug log
      
      if (result.success) {
        console.log('Structures data:', result.data); // Debug log
        setStructures(result.data || []);
      } else {
        setError(result.error || 'Failed to load structures');
      }
    } catch (err) {
      console.error('Fetch error:', err); // Debug log
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/');
  };

  const handleCreateStructure = () => {
    router.push('/create');
  };

  const handleViewStructure = (structureId) => {
    router.push(`/structure/${structureId}`);
  };

  const handleDeleteStructure = async (structureId) => {
    if (!confirm('Are you sure you want to delete this structure?')) {
      return;
    }

    try {
      const result = await structureApi.delete(structureId);
      
      if (result.success) {
        // Refresh the structures list
        fetchStructures();
      } else {
        alert(result.error || 'Failed to delete structure');
      }
    } catch (err) {
      alert('An unexpected error occurred');
    }
  };

  return (
    <>
      {/* The Navbar component with links for the header */}
      <Navbar fluid rounded className="mb-8">
        <NavbarBrand as={Link} href="/structure">
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">Home</span>
        </NavbarBrand>
        <NavbarToggle />
        <NavbarCollapse>
          <NavbarLink className="font-semibold text-gray-900 cursor-pointer">
            My Work
          </NavbarLink>
          <NavbarLink 
            onClick={handleLogout}
            className="font-semibold text-red-500 hover:text-red-700 cursor-pointer"
          >
            Logout
          </NavbarLink>
        </NavbarCollapse>
      </Navbar>

      <div className="container mx-auto p-8">
        {/* The 'Create New Structure' button, centered at the top */}
        <div className="flex justify-center mb-8">
          <Button onClick={handleCreateStructure}>Create New Structure</Button>
        </div>

        {error && (
          <Alert color="failure" className="mb-6">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner aria-label="Loading structures" size="xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {structures.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">No structures found. Create your first structure!</p>
              </div>
            ) : (
              structures.map((structure) => (
                <TreeCanvas 
                  key={structure.id}
                  structure={structure}
                  onEdit={handleViewStructure}
                  onDelete={handleDeleteStructure}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
