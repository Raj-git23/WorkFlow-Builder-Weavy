"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  Panel,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
  reconnectEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "@/types/allnode";
import {
  NodeActionsContext,
  NodeType,
  Snapshot,
  ToolMode,
} from "@/types/nodetype";
import LeftSidebar from "@/components/editor/LeftSidebar";
import { BottomControls } from "@/components/editor/BottomControls";
import { genId, takeSnapshot } from "@/lib/helper";
import { MAX_HISTORY } from "@/lib/constant";
import { getEdgeStyle } from "@/lib/edge-style";
import { DEFAULT_DATA } from "@/lib/nodesConfig";
import { useFlowStore } from "@/store/useFlowStore";

//  Canvas

export function Canvas() {
  const [toolMode, setToolMode] = useState<ToolMode>("selection");
  const { screenToFlowPosition, getNode } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const isRestoringRef = useRef(false);

  // Since functions are memomized, might capture stale state so to get latest data, we use useRef
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<Snapshot | null>(null);
  const dragTypeRef = useRef<NodeType | null>(null);
  const edgeReconnectSuccessful = useRef(true);

  const syncEdges = useFlowStore((s) => s.setEdges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    syncEdges(edges);
  }, [edges, syncEdges]);

  // We're saving history using debounce of 300 ms
  const scheduleHistoryPush = useCallback(() => {
    if (isRestoringRef.current) return;

    if (!pendingSnapshotRef.current) {
      pendingSnapshotRef.current = takeSnapshot(
        nodesRef.current,
        edgesRef.current,
      );
    }

    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const snap = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null;
      historyTimerRef.current = null;

      if (snap) {
        setPast((p) => [...p, snap].slice(-MAX_HISTORY));
        setFuture([]);
      }
    }, 300);
  }, []);

  const pushNow = useCallback(() => {
    if (isRestoringRef.current) return;

    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      pendingSnapshotRef.current = null;
    }

    setPast((p) =>
      [...p, takeSnapshot(nodesRef.current, edgesRef.current)].slice(
        -MAX_HISTORY,
      ),
    );

    setFuture([]);
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      scheduleHistoryPush();
      onNodesChange(changes);
    },
    [onNodesChange, scheduleHistoryPush],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      scheduleHistoryPush();
      onEdgesChange(changes);
    },
    [onEdgesChange, scheduleHistoryPush],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      pushNow();
      setEdges((eds) => {
        const sourceNode = nodesRef.current.find(
          (n) => n.id === connection.source,
        );
        const targetNode = nodesRef.current.find(
          (n) => n.id === connection.target,
        );

        if (!sourceNode || !targetNode) return addEdge(connection, eds);

        const edgeStyle = getEdgeStyle(
          sourceNode.type as NodeType,
          targetNode.type as NodeType,
        );

        return addEdge({ ...connection, ...edgeStyle }, eds);
      });
    },
    [setEdges, pushNow],
  );

  // When a node is deleted, reconnect its incomers to its outgoers
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setEdges((eds) =>
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodesRef.current, acc);
          const outgoers = getOutgoers(node, nodesRef.current, acc);
          const connectedEdges = getConnectedEdges([node], acc);
          const remaining = acc.filter((e) => !connectedEdges.includes(e));
          const bridged = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            })),
          );
          return [...remaining, ...bridged];
        }, eds),
      );
    },
    [setEdges],
  );

  const handleUndo = useCallback(() => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    isRestoringRef.current = true;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [
      ...f,
      takeSnapshot(nodesRef.current, edgesRef.current),
    ]);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, [past, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (!future.length) return;
    const next = future[future.length - 1];
    isRestoringRef.current = true;
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [
      ...p,
      takeSnapshot(nodesRef.current, edgesRef.current),
    ]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, [future, setNodes, setEdges]);

  // Main function which creates a new node
  const spawnNode = useCallback(
    (type: NodeType, position: { x: number; y: number }, data?: Record<string, unknown>) => {
      pushNow();
      const newNode: Node = {
        id: genId(type),
        type,
        position,
        data: { ...(data ?? DEFAULT_DATA[type]) }, // Initialise a node with some values
      };
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    [setNodes, pushNow],
  );

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2 + Math.random() * 80 - 40,
        y: window.innerHeight / 2 + Math.random() * 80 - 40,
      });
      spawnNode(type, position);
    },
    [screenToFlowPosition, spawnNode],
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const node = getNode(id);
      if (!node) return;
      spawnNode(
        node.type as NodeType,
        { x: node.position.x + 30, y: node.position.y + 30 },
        node.data as Record<string, unknown>,
      );
    },
    [getNode, spawnNode],
  );

  const deleteNode = useCallback(
    (id: string) => {
      pushNow();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges, pushNow],
  );

  const handleDragStart = useCallback((e: React.DragEvent, type: NodeType) => {
    dragTypeRef.current = type;
    e.dataTransfer.setData("application/reactflow-nodetype", type);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = (e.dataTransfer.getData(
        "application/reactflow-nodetype",
      ) as NodeType) || dragTypeRef.current;

      if (!type) return;
      dragTypeRef.current = null;
      spawnNode(type, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [screenToFlowPosition, spawnNode],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges((els) => {
        const sourceNode = nodesRef.current.find(
          (n) => n.id === newConnection.source,
        );
        const targetNode = nodesRef.current.find(
          (n) => n.id === newConnection.target,
        );

        if (!sourceNode || !targetNode)
          return reconnectEdge(oldEdge, newConnection, els);

        const edgeStyle = getEdgeStyle(
          sourceNode.type as NodeType,
          targetNode.type as NodeType,
        );

        return reconnectEdge(oldEdge, { ...newConnection, ...edgeStyle }, els);
      });
    },
    [setEdges],
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }

      edgeReconnectSuccessful.current = true;
    },
    [setEdges],
  );

  return (
    <NodeActionsContext.Provider value={{ duplicateNode, deleteNode }}>
      <main>
        <div className="absolute h-full z-10">
          <LeftSidebar
            onAddNode={handleAddNode}
            onDragStart={handleDragStart}
          />
        </div>

        <div style={{ height: "100vh", width: "100vw" }}>
          <ReactFlow
            minZoom={0.1}
            maxZoom={4}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onNodesDelete={onNodesDelete}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            panOnDrag={toolMode === "pan" ? true : [1, 2]}
            panOnScroll={toolMode === "selection"}
            selectionOnDrag={toolMode === "selection"}
            nodesDraggable
            nodesConnectable
            elementsSelectable
          >
            <Panel position="bottom-center" className="mb-4">
              <BottomControls
                toolMode={toolMode}
                onToolChange={setToolMode}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={past.length > 0}
                canRedo={future.length > 0}
              />
            </Panel>

            <Background color="#253042" bgColor="#0a0a0a" gap={13} />
            <MiniMap
              maskStrokeWidth={2}
              offsetScale={10}
              nodeStrokeWidth={3}
              bgColor="#212126"
              nodeStrokeColor="#f2f0f8"
              nodeColor="#1c1b1f"
              maskColor="#353539"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>
      </main>
    </NodeActionsContext.Provider>
  );
}

