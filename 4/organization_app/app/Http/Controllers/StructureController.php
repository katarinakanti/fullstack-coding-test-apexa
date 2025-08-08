<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Structure;
use App\Models\Node;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StructureController extends Controller
{
    /**
     * Display a listing of the authenticated user's structures.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            $structures = Auth::user()->structures()->with('nodes')->get();
            return response()->json($structures);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to retrieve structures.'], 500);
        }
    }

    /**
     * Show a single structure and its nodes.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $structure = Auth::user()->structures()->with('nodes')->findOrFail($id);
            return response()->json($structure);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Structure not found.'], 404);
        }
    }

    /**
     * Store a newly created structure and its nodes.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'label' => 'required|max:255',
                'nodes' => 'required|array',
                'nodes.*.label' => 'required|max:255',
                'nodes.*.parent_id' => 'nullable|string|max:255',
            ]);

            DB::beginTransaction();

            $structure = Auth::user()->structures()->create([
                'label' => $request->label,
            ]);
            
            $nodesData = collect($request->nodes);

            // A map to link node labels to database IDs
            $labelToIdMapping = [];
            $allNodes = [];

            // First pass: Create all nodes without their parent relationship
            foreach ($nodesData as $nodeData) {
                $createdNode = $structure->nodes()->create([
                    'label' => $nodeData['label'],
                    'parent_id' => null,
                ]);
                $labelToIdMapping[$nodeData['label']] = $createdNode->id;
                $allNodes[] = [
                    'node' => $createdNode,
                    'parent_label' => isset($nodeData['parent_id']) && $nodeData['parent_id'] !== null && $nodeData['parent_id'] !== '' ? $nodeData['parent_id'] : null
                ];
            }

            // Second pass: Update the parent_id for each node using labels
            foreach ($allNodes as $nodeInfo) {
                if ($nodeInfo['parent_label'] !== null && $nodeInfo['parent_label'] !== '' && isset($labelToIdMapping[$nodeInfo['parent_label']])) {
                    $nodeInfo['node']->update(['parent_id' => $labelToIdMapping[$nodeInfo['parent_label']]]);
                }
            }

            DB::commit();

            return response()->json(['message' => 'Structure saved successfully.', 'structure' => $structure], 201);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json(['errors' => $e->errors()], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to save structure. Reason: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update the specified structure and its nodes.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            // Debug logging
            \Log::info('Structure update request received', [
                'structure_id' => $id,
                'request_data' => $request->all(),
                'nodes_data' => $request->input('nodes', [])
            ]);
            
            $request->validate([
                'label' => 'required|max:255',
                'nodes' => 'required|array',
                'nodes.*.id' => 'nullable|integer',
                'nodes.*.label' => 'required|max:255',
                'nodes.*.parent_id' => 'nullable|string|max:255',
            ]);
            
            \Log::info('Validation passed', ['nodes_count' => count($request->input('nodes', []))]);
            
            $structure = Auth::user()->structures()->findOrFail($id);

            DB::beginTransaction();

            $structure->update(['label' => $request->label]);

            // Delete old nodes
            $structure->nodes()->delete();
            \Log::info('Old nodes deleted');

            // Create new nodes
            $nodesData = $request->nodes;
            $savedNodes = [];
            $labelToIdMap = [];
            
            \Log::info('Creating nodes', ['nodes_data' => $nodesData]);
            
            // First pass: Create all nodes without parent relationships
            foreach ($nodesData as $node) {
                \Log::info('Creating node', ['label' => $node['label'], 'parent_id' => $node['parent_id'] ?? null]);
                $createdNode = $structure->nodes()->create([
                    'label' => $node['label'],
                    'parent_id' => null,
                ]);
                $labelToIdMap[$node['label']] = $createdNode->id;
                
                $parentLabel = isset($node['parent_id']) && $node['parent_id'] !== null && $node['parent_id'] !== '' ? $node['parent_id'] : null;
                \Log::info('Parent label determination', [
                    'node_label' => $node['label'],
                    'raw_parent_id' => $node['parent_id'] ?? 'NULL',
                    'parent_id_type' => gettype($node['parent_id'] ?? null),
                    'is_empty_check' => empty($node['parent_id'] ?? null),
                    'final_parent_label' => $parentLabel
                ]);
                
                $savedNodes[] = [
                    'node' => $createdNode,
                    'parent_label' => $parentLabel
                ];
            }

            \Log::info('Label to ID mapping', ['mapping' => $labelToIdMap]);

            // Second pass: Update parent relationships using labels
            foreach ($savedNodes as $nodeInfo) {
                if ($nodeInfo['parent_label'] !== null && $nodeInfo['parent_label'] !== '' && isset($labelToIdMap[$nodeInfo['parent_label']])) {
                    \Log::info('Setting parent relationship', [
                        'node_label' => $nodeInfo['node']->label,
                        'parent_label' => $nodeInfo['parent_label'],
                        'parent_id' => $labelToIdMap[$nodeInfo['parent_label']]
                    ]);
                    $nodeInfo['node']->update(['parent_id' => $labelToIdMap[$nodeInfo['parent_label']]]);
                } else {
                    \Log::info('Skipping parent relationship', [
                        'node_label' => $nodeInfo['node']->label,
                        'parent_label' => $nodeInfo['parent_label'],
                        'parent_label_is_null' => $nodeInfo['parent_label'] === null,
                        'parent_label_is_empty_string' => $nodeInfo['parent_label'] === '',
                        'parent_exists_in_map' => isset($labelToIdMap[$nodeInfo['parent_label'] ?? ''])
                    ]);
                }
            }

            DB::commit();
            \Log::info('Structure updated successfully');

            return response()->json(['message' => 'Structure updated successfully.', 'structure' => $structure]);
        } catch (ValidationException $e) {
            DB::rollBack();
            \Log::error('Validation failed', ['errors' => $e->errors()]);
            return response()->json(['errors' => $e->errors()], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Update failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Failed to update structure.'], 500);
        }
    }

    /**
     * Remove the specified structure and its nodes.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            $structure = Auth::user()->structures()->findOrFail($id);

            DB::beginTransaction();
            $structure->delete();
            DB::commit();

            return response()->json(['message' => 'Structure deleted successfully.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete structure.'], 500);
        }
    }
}
