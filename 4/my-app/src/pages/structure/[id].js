import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import { Card, Alert, Spinner } from "flowbite-react";
import { Button, Label, TextInput } from "flowbite-react";
import Link from "next/link";
import { authApi, structureApi } from '../../services/api';

const inter = Inter({ subsets: ['latin'] })

// Function to build tree structure from nodes for edit preview (uses labels for parent references)
const buildTreeFromLabels = (nodes) => {
  if (!nodes || nodes.length === 0) return null;
  
  const nodeMap = {};
  const roots = [];

  // Create a map of nodes by label
  nodes.forEach(n => {
    if (n.label && n.label.trim()) {
      nodeMap[n.label] = { 
        ...n, 
        children: [],
        label: n.label.toString()
      };
    }
  });

  // Build parent-child relationships using labels
  nodes.forEach(n => {
    if (n.label && n.label.trim()) {
      const currentNode = nodeMap[n.label];
      if (n.parent_id && typeof n.parent_id === 'string' && n.parent_id.trim() && nodeMap[n.parent_id]) {
        // This node has a valid parent, add it as a child
        nodeMap[n.parent_id].children.push(currentNode);
      } else {
        // This node has no parent or invalid parent, it's a root
        roots.push(currentNode);
      }
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

// Function to build tree structure from nodes (uses IDs for parent references)
const buildTree = (nodes) => {
  if (!nodes || nodes.length === 0) return null;
  
  // Debug: Log the received nodes data
  console.log('buildTree (ID-based) received nodes:', nodes);
  
  const nodeMap = {};
  const roots = [];

  // Create a map of nodes for easy lookup by ID
  nodes.forEach(n => {
    console.log(`Processing node: ${n.label} (ID: ${n.id}, parent_id: ${n.parent_id})`);
    nodeMap[n.id] = { 
      ...n, 
      children: [],
      label: n.label.toString()
    };
  });

  console.log('nodeMap after first pass:', nodeMap);

  // Build the tree structure using IDs
  nodes.forEach(n => {
    const currentNode = nodeMap[n.id];
    
    console.log(`Building relationships for ${n.label}: parent_id=${n.parent_id}, parent exists=${!!nodeMap[n.parent_id]}`);
    
    if (n.parent_id && nodeMap[n.parent_id]) {
      nodeMap[n.parent_id].children.push(currentNode);
      console.log(`Added ${n.label} as child of ${nodeMap[n.parent_id].label}`);
    } else {
      // Node with no parent is a root
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
const TreeVisualization = ({ nodes, useLabels = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && nodes) {
      drawTree(canvasRef.current, nodes);
    }
  }, [nodes]);

  const drawTree = (canvas, nodes) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Filter out empty nodes
    const validNodes = nodes.filter(node => node.label && node.label.trim() !== '');
    if (validNodes.length === 0) {
      // Draw placeholder text
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillText('Add nodes to see preview', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Choose the correct tree building function based on data type
    const treeData = useLabels ? buildTreeFromLabels(validNodes) : buildTree(validNodes);
    if (!treeData) return;

    const nodeRadius = 18;
    const horizontalSpacing = 60;
    const verticalSpacing = 50;

    const traverseAndDraw = (node, x, y, level) => {
      // Skip virtual root drawing
      if (node.id === 'virtual-root') {
        // Just draw children
        if (node.children && node.children.length > 0) {
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
    traverseAndDraw(treeData, canvas.width / 2, 40, 0);
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={250} 
      className="border rounded-lg bg-gray-50"
    />
  );
};

export default function StructureDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    label: '',
    nodes: []
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/');
      return;
    }
    
    if (id) {
      fetchStructure();
    }
  }, [router, id]);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const result = await structureApi.getById(id);
      
      if (result.success) {
        setStructure(result.data);
        
        // Convert parent_id to parent labels for editing
        const nodesWithParentLabels = result.data.nodes?.map(node => {
          let parentLabel = '';
          if (node.parent_id) {
            const parentNode = result.data.nodes.find(n => n.id === node.parent_id);
            parentLabel = parentNode ? parentNode.label : '';
          }
          return {
            ...node,
            parent_id: parentLabel,
            tempId: node.id || Date.now() + Math.random() // Add tempId for consistency
          };
        }) || [];
        
        setEditFormData({
          label: result.data.label,
          nodes: nodesWithParentLabels
        });
      } else {
        setError(result.error || 'Failed to load structure');
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    
    // Convert parent_id to parent labels for editing
    const nodesWithParentLabels = structure.nodes?.map(node => {
      let parentLabel = '';
      if (node.parent_id) {
        const parentNode = structure.nodes.find(n => n.id === node.parent_id);
        parentLabel = parentNode ? parentNode.label : '';
      }
      return {
        ...node,
        parent_id: parentLabel,
        tempId: node.id || Date.now() + Math.random() // Add tempId for consistency
      };
    }) || [];
    
    setEditFormData({
      label: structure.label,
      nodes: nodesWithParentLabels
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNodeChange = (index, field, value) => {
    console.log(`Changing node ${index}, field ${field}, value:`, value);
    const updatedNodes = [...editFormData.nodes];
    updatedNodes[index] = {
      ...updatedNodes[index],
      [field]: field === 'parent_id' && value === '' ? null : value
    };
    console.log('Updated nodes array:', updatedNodes);
    setEditFormData(prev => ({
      ...prev,
      nodes: updatedNodes
    }));
  };

  // Test function to simulate the exact user workflow
  const testWorkflow = () => {
    console.log('=== TESTING WORKFLOW ===');
    console.log('1. Current form state:');
    logFormState();
    
    console.log('2. Adding a new node...');
    const newNode = { 
      label: 'TestNode', 
      parent_id: '1', // Set parent to node with label '1'
      tempId: Date.now() + Math.random()
    };
    
    setEditFormData(prev => {
      const newNodes = [...prev.nodes, newNode];
      console.log('3. After adding node:', newNodes);
      return { ...prev, nodes: newNodes };
    });
    
    console.log('=== END TEST ===');
  };

  // Test function to simulate setting "0" as parent to "1"
  const testZeroParent = () => {
    console.log('=== TESTING ZERO PARENT ===');
    console.log('This simulates setting "0" as parent to node "1"');
    
    setEditFormData(prev => {
      const newNodes = prev.nodes.map(node => {
        if (node.label === '1') {
          console.log('Setting parent of node "1" to "0"');
          return { ...node, parent_id: '0' };
        }
        return node;
      });
      console.log('Updated nodes:', newNodes);
      return { ...prev, nodes: newNodes };
    });
    
    console.log('=== END ZERO PARENT TEST ===');
  };

  // Test function to submit form with zero parent
  const testSubmitZeroParent = async () => {
    console.log('=== TESTING SUBMIT WITH ZERO PARENT ===');
    
    // First set the parent relationship
    setEditFormData(prev => {
      const newNodes = prev.nodes.map(node => {
        if (node.label === '1') {
          console.log('Setting parent of node "1" to "0"');
          return { ...node, parent_id: '0' };
        }
        return node;
      });
      return { ...prev, nodes: newNodes };
    });

    // Wait a moment for state to update
    setTimeout(async () => {
      try {
        console.log('About to submit with:', editFormData);
        const cleanFormData = {
          ...editFormData,
          nodes: editFormData.nodes.map(node => {
            const { tempId, ...cleanNode } = node;
            return cleanNode;
          })
        };
        
        console.log('Clean form data to submit:', cleanFormData);
        const result = await structureApi.update(id, cleanFormData);
        console.log('Submit result:', result);
      } catch (err) {
        console.error('Submit error:', err);
      }
    }, 500);
    
    console.log('=== END SUBMIT TEST ===');
  };

  // Debug function to check form state
  const logFormState = () => {
    console.log('=== FORM STATE DEBUG ===');
    console.log('editFormData.label:', editFormData.label);
    console.log('editFormData.nodes:', editFormData.nodes.map((n, i) => ({
      index: i,
      label: n.label,
      parent_id: n.parent_id,
      id: n.id
    })));
    console.log('========================');
  };

  const addNode = () => {
    console.log('Adding node. Current editFormData.nodes:', editFormData.nodes);
    logFormState();
    setEditFormData(prev => {
      const newNode = { 
        label: '', 
        parent_id: null, 
        tempId: Date.now() + Math.random() // Add unique temporary ID for React key
      };
      const newNodes = [...prev.nodes, newNode];
      console.log('After adding node. New nodes array:', newNodes);
      return {
        ...prev,
        nodes: newNodes
      };
    });
  };

  const removeNode = (index) => {
    if (editFormData.nodes.length > 1) {
      const updatedNodes = editFormData.nodes.filter((_, i) => i !== index);
      setEditFormData(prev => ({
        ...prev,
        nodes: updatedNodes
      }));
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    console.log('handleUpdateSubmit called!', e);
    setUpdateLoading(true);
    setError('');

      console.log('Form submission started', editFormData);
      console.log('Nodes being sent:', editFormData.nodes.map(n => ({
        label: n.label,
        parent_id: n.parent_id,
        id: n.id
      })));    try {
      // Validate that all nodes have labels
      const hasEmptyNodes = editFormData.nodes.some(node => !node.label.trim());
      if (hasEmptyNodes) {
        console.log('Validation failed: empty nodes found');
        console.log('Nodes:', editFormData.nodes);
        setError('All nodes must have a label');
        setUpdateLoading(false);
        return;
      }

      // Check for duplicate labels
      const labels = editFormData.nodes.map(n => n.label.trim());
      const uniqueLabels = [...new Set(labels)];
      if (labels.length !== uniqueLabels.length) {
        console.log('Validation failed: duplicate labels found');
        console.log('Labels:', labels);
        setError('All node labels must be unique');
        setUpdateLoading(false);
        return;
      }

      console.log('Calling API update with:', editFormData);
      console.log('=== DETAILED FORM DATA ===');
      console.log('Structure label:', editFormData.label);
      console.log('Nodes count:', editFormData.nodes.length);
      editFormData.nodes.forEach((node, index) => {
        console.log(`Node ${index}:`, {
          label: node.label,
          parent_id: node.parent_id,
          parent_type: typeof node.parent_id,
          parent_empty: node.parent_id === null || node.parent_id === '',
          id: node.id,
          tempId: node.tempId
        });
      });
      console.log('=== END DETAILED FORM DATA ===');
      
      // Clean the form data by removing tempId fields before sending to API
      const cleanFormData = {
        ...editFormData,
        nodes: editFormData.nodes.map(node => {
          const { tempId, ...cleanNode } = node;
          return cleanNode;
        })
      };
      
      const result = await structureApi.update(id, cleanFormData);
      console.log('API update result:', result);
      
      if (result.success) {
        console.log('Update successful');
        setIsEditing(false);
        fetchStructure(); // Refresh the structure data
      } else {
        console.log('Update failed:', result.error);
        setError(result.error || 'Failed to update structure');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('An unexpected error occurred');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner aria-label="Loading structure" size="xl" />
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="container mx-auto p-8">
        <Alert color="failure">
          Structure not found or you don't have permission to view it.
        </Alert>
      </div>
    );
  }

  return (
    <>
      <Navbar fluid rounded className="mb-8">
        <NavbarBrand as={Link} href="/structure">
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
            {structure.label}
          </span>
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
        {error && (
          <Alert color="failure" className="mb-6">
            {error}
          </Alert>
        )}

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{structure.label}</h1>
            {!isEditing && (
              <Button onClick={handleEdit}>
                Edit Structure
              </Button>
            )}
          </div>

          {!isEditing && (
            <>
              <h2 className="text-xl font-semibold mb-4">Structure Visualization</h2>
              <TreeVisualization nodes={structure.nodes} useLabels={false} />
            </>
          )}

          {isEditing && (
            <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
              {/* Form Section */}
              <Card className="w-full lg:w-1/2">
                <h2 className="text-xl font-bold mb-4">Node and Parent Configuration</h2>

                <form className="flex flex-col gap-4" onSubmit={handleUpdateSubmit}>
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
                      value={editFormData.label}
                      onChange={handleInputChange}
                      disabled={updateLoading}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <Label className="font-medium">Node</Label>
                    <Label className="font-medium">Parent</Label>
                  </div>

                  {editFormData.nodes.map((node, index) => (
                    <div key={node.id || node.tempId || index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <TextInput 
                          type="text" 
                          placeholder="Node name" 
                          required 
                          value={node.label || ''}
                          onChange={(e) => handleNodeChange(index, 'label', e.target.value)}
                          disabled={updateLoading}
                        />
                      </div>
                      <div className="flex-1">
                        <TextInput 
                          type="text" 
                          placeholder="Parent node" 
                          value={node.parent_id || ''}
                          onChange={(e) => handleNodeChange(index, 'parent_id', e.target.value)}
                          disabled={updateLoading}
                        />
                      </div>
                      {editFormData.nodes.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          color="failure"
                          onClick={() => removeNode(index)}
                          disabled={updateLoading}
                        >
                          -
                        </Button>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      color="gray"
                      onClick={addNode}
                      disabled={updateLoading}
                      className="flex-1"
                    >
                      + Add
                    </Button>
                    <Button
                      type="button"
                      color="blue"
                      onClick={logFormState}
                      disabled={updateLoading}
                      className="px-4"
                    >
                      Debug
                    </Button>
                    <Button
                      type="button"
                      color="green"
                      onClick={testWorkflow}
                      disabled={updateLoading}
                      className="px-4"
                    >
                      Test
                    </Button>
                    <Button
                      type="button"
                      color="red"
                      onClick={testZeroParent}
                      disabled={updateLoading}
                      className="px-3"
                    >
                      0→1
                    </Button>
                    <Button
                      type="button"
                      color="purple"
                      onClick={testSubmitZeroParent}
                      disabled={updateLoading}
                      className="px-3"
                    >
                      Submit
                    </Button>
                  </div>

                  {/* Save and Cancel buttons */}
                  <div className="flex gap-4 mt-4">
                    <Button
                      type="submit"
                      disabled={updateLoading}
                      className="flex-1"
                    >
                      {updateLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      color="gray"
                      onClick={handleCancelEdit}
                      disabled={updateLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Tree Visualization Section */}
              <Card className="w-full lg:w-1/2">
                <h2 className="text-xl font-bold mb-4 text-center">Structure Preview</h2>
                <div className="flex justify-center mb-4">
                  <TreeVisualization nodes={editFormData.nodes} useLabels={true} />
                </div>
              </Card>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
