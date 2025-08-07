from collections import defaultdict

# The interfaces for clarity, although not strictly needed in Python --> OOP nya biar kebayang ig
# class OrganizationNode:
#     def __init__(self, label, parent):
#         self.label = label
#         self.parent = parent
#
# class Tree:
#     def __init__(self, label, children=None):
#         self.label = label
#         self.children = children if children is not None else []

def generate_tree(array_of_nodes):
    """
    Transforms an array of nodes into a nested tree structure.

    Args:
        array_of_nodes (list): A list of dictionaries, where each dict has a
                               'label' and a 'parent' key.

    Returns:
        dict: The root of the tree structure.
    """
    #kalau arg kosong return none
    if not array_of_nodes:
        return None

    # Use a dictionary to store nodes by their label for efficient lookup
    # Inisiasi dictionary
    """
    nodes_by_label = {}  # Step 1: Start with an empty dictionary
    
    # Step 2: Loop through the list
    for node in array_of_nodes:
    
        # Step 3: Extract the key and the value for this iteration
        key = node['label']
        value = {'label': node['label'], 'children': []}
    
        # Step 4: Add the key-value pair to the dictionary
        nodes_by_label[key] = value
    --> bisa dibuat one-liner sebagai berikut:
    """
    nodes_by_label = {node['label']: {'label': node['label'], 'children': []} for node in array_of_nodes}
    
    root_node = None #diinisasi tapi belum diisi
    
    for node_data in array_of_nodes:
        label = node_data['label']
        parent_label = node_data['parent']
        
        current_node = nodes_by_label[label]
        
        if parent_label is None:
            root_node = current_node #jika tidak memiliki parent, maka adalah root_node
        else:
            if parent_label in nodes_by_label:
                parent_node = nodes_by_label[parent_label]
                parent_node['children'].append(current_node)
    
    return root_node

def flatten_tree(tree_node):
    """
    Transforms a nested tree structure into a flat array of nodes.

    Args:
        tree_node (dict): The root of the tree structure.

    Returns:
        list: A list of dictionaries, where each dict has a 'label'
              and a 'parent' key.
    """
    if not tree_node:
        return []

    result = []
    
    # A queue for Breadth-First Search (BFS) to traverse the tree
    queue = [(tree_node, None)] #None di sini adalah root tidak memiliki parent
    
    while queue:
        current_node, parent_label = queue.pop(0)
        
        # Add the current node to the result list
        result.append({'label': current_node['label'], 'parent': parent_label})
        
        # Add its children to the queue
        for child in current_node['children']:
            queue.append((child, current_node['label'])) #tuple karena unchangeable once created
            
    return result

# --- Example Usage ---

array_A = [
    { "label": 1, "parent": None },
    { "label": 2, "parent": 1 },
    { "label": 3, "parent": 2 },
    { "label": 4, "parent": 2 },
    { "label": 5, "parent": 1 },
    { "label": 6, "parent": 1 },
    { "label": 7, "parent": 6 },
    { "label": 8, "parent": 6 },
    { "label": 9, "parent": 8 }
]

print("--- Generating Tree from Array ---")
tree_A = generate_tree(array_A)
import json
print(json.dumps(tree_A, indent=2)) #agar ngeprintnya rapih

print("\n--- Flattening Tree to Array ---")
flattened_array = flatten_tree(tree_A)
print(flattened_array)

def compare_arrays(arr1, arr2):
    return set(tuple(sorted(d.items())) for d in arr1) == set(tuple(sorted(d.items())) for d in arr2)
# view items --> sort agar urutannya sama --> tuple supaya hashable --> set supaya tidak ada duplikat data 

print("\nIs the flattened array the same as the original array? ", compare_arrays(array_A, flattened_array))