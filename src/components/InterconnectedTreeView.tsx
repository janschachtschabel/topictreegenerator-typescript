import { useState, useEffect, useRef } from 'react';
import { TopicTree, Collection } from '../types/TopicTree';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Info } from 'lucide-react';

interface InterconnectedTreeViewProps {
  tree: TopicTree;
}

interface Node {
  id: string;
  title: string;
  originalTitle: string;
  sector: string;
  level: number;
  parentId?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface Link {
  source: string;
  target: string;
  type: 'hierarchy' | 'connection';
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const COLORS = {
  grundbildend: '#fcd34d',
  allgemeinbildend: '#818cf8',
  berufsbildend: '#4ade80',
  akademisch: '#e879f9',
  center: '#94a3b8'
};

const SECTOR_ANGLES = {
  grundbildend: -Math.PI / 2,    // Top
  allgemeinbildend: 0,           // Right
  berufsbildend: Math.PI / 2,    // Bottom
  akademisch: Math.PI            // Left
};

export default function InterconnectedTreeView({ tree }: InterconnectedTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const svgGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>();

  // Node size based on level
  const getNodeSize = (level: number) => {
    switch (level) {
      case -1: return 20;  // Center node
      case 0: return 16;   // Sector nodes
      case 1: return 12;   // Main categories
      case 2: return 8;    // Subcategories
      default: return 6;   // Further levels
    }
  };

  useEffect(() => {
    if (!tree) return;

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    // Clear existing graph
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll('*').remove();
    }

    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, string[]>();

    // Add center node
    const centerId = 'center';
    nodes.push({
      id: centerId,
      title: tree.metadata.title,
      sector: 'center',
      level: -1
    });

    // Add sector nodes
    Object.keys(COLORS).forEach(sector => {
      if (sector === 'center') return;
      
      const sectorId = `sector-${sector}`;
      nodes.push({
        id: sectorId,
        title: sector.charAt(0).toUpperCase() + sector.slice(1),
        sector,
        level: 0
      });

      // Link sector nodes to center
      links.push({
        source: centerId,
        target: sectorId,
        type: 'hierarchy'
      });

      // Process nodes for each sector
      const processNode = (node: Collection, level: number, parentId: string) => {
        const nodeId = `${sector}-${node.properties.ccm_collectionshorttitle[0]}`;
        const sectorTitle = node.properties.cm_alternative_titles?.[sector];
        const hasAlternativeTitle = sectorTitle && sectorTitle.trim() !== '';

        // Always create node for main categories (level 1), otherwise only if it has a sector title
        if (level === 1 || hasAlternativeTitle) {
          nodes.push({
            id: nodeId,
            title: hasAlternativeTitle ? sectorTitle : node.title,
            originalTitle: node.title, // Store original title for finding connections
            sector,
            level,
            parentId
          });

          links.push({
            source: parentId,
            target: nodeId,
            type: 'hierarchy'
          });

          // Track corresponding nodes across sectors
          const baseTitle = node.title;
          if (!nodeMap.has(baseTitle)) {
            nodeMap.set(baseTitle, []);
          }
          
          // Only track for connections if it has a sector title
          if (hasAlternativeTitle) {
            nodeMap.get(baseTitle)!.push(nodeId);
          }

          // Process subcollections
          if (node.subcollections) {
            node.subcollections.forEach(child => {
              // Only process subcollections if parent node exists
              processNode(child, level + 1, nodeId);
            });
          }
        }
      };

      // Process main categories
      tree.collection.forEach(node => {
        // Always process main categories
        processNode(node, 1, sectorId);
      });
    });

    setGraphData({ nodes, links });
  }, [tree]);

  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear previous graph
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create force simulation
    simulationRef.current = d3.forceSimulation<Node>(graphData.nodes)
      .force('link', d3.forceLink<Node, Link>(graphData.links)
        .id(d => d.id)
        .distance(link => {
          if (link.type === 'hierarchy') {
            const sourceNode = graphData.nodes.find(n => n.id === link.source);
            const targetNode = graphData.nodes.find(n => n.id === link.target);
            if (sourceNode?.level === -1) return 120; // Reduced distance from center to sectors
            if (sourceNode?.level === 0) return 180; // Increased distance from sectors to main categories
            return 150 + (targetNode?.level || 0) * 50; // Progressive spacing for hierarchy levels
          }
          return 0;
        })
        .strength(link => link.type === 'hierarchy' ? 1 : 0))
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('collision', d3.forceCollide().radius(d => {
        // Larger collision radius for higher level nodes to prevent overlap
        return 30 + (3 - d.level) * 10;
      }))
      .force('x', d3.forceX().x(d => {
        if (d.level === -1) return centerX;
        if (d.level === 0) {
          const angle = SECTOR_ANGLES[d.sector];
          return centerX + Math.cos(angle) * 120; // Reduced radius for sector nodes
        }
        const angle = SECTOR_ANGLES[d.sector];
        // Progressive spacing that spreads out more at each level
        const distance = 120 + Math.pow(d.level, 1.5) * 100;
        // Add some random offset for nodes at the same level
        const spread = (d.level > 0) ? (Math.random() - 0.5) * 100 : 0;
        const spreadAngle = angle + spread * 0.02;
        return centerX + Math.cos(spreadAngle) * distance;
      }).strength(1))
      .force('y', d3.forceY().y(d => {
        if (d.level === -1) return centerY;
        if (d.level === 0) {
          const angle = SECTOR_ANGLES[d.sector];
          return centerY + Math.sin(angle) * 120; // Reduced radius for sector nodes
        }
        const angle = SECTOR_ANGLES[d.sector];
        // Progressive spacing that spreads out more at each level
        const distance = 120 + Math.pow(d.level, 1.5) * 100;
        // Add some random offset for nodes at the same level
        const spread = (d.level > 0) ? (Math.random() - 0.5) * 100 : 0;
        const spreadAngle = angle + spread * 0.02;
        return centerY + Math.sin(spreadAngle) * distance;
      }).strength(1));

    svgGRef.current = svg.append('g');
    const g = svgGRef.current;

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setTransform(event.transform);
      });

    svg.call(zoom);

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links.filter(l => l.type === 'hierarchy'))
      .join('line')
      .attr('stroke', d => {
        const sourceNode = graphData.nodes.find(n => n.id === d.source);
        return sourceNode ? `${COLORS[sourceNode.sector]}99` : '#ddd';
      })
      .attr('stroke-width', d => {
        const sourceNode = graphData.nodes.find(n => n.id === d.source);
        return sourceNode?.level === -1 ? 3 : 2;
      });

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => getNodeSize(d.level))
      .attr('fill', d => COLORS[d.sector])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add mouseover and mouseout handlers
    node.on('mouseover', (event, d) => {
      if (d.level === -1) return; // Ignore center node
      
      // Find corresponding nodes in other sectors
      const correspondingNodes = graphData.nodes.filter(n => 
        (n.originalTitle === d.originalTitle || 
         (n.level > 0 && d.level > 0 && n.title === d.title)) && 
        n.sector !== d.sector && 
        n.sector !== 'center'
      );

      if (correspondingNodes.length === 0) return;

      // Add connection links
      g.append('g')
        .attr('class', 'connection-link')
        .selectAll('line')
        .data(correspondingNodes.map(target => ({
          source: d,
          target,
          type: 'connection' as const
        })))
        .join('line')
        .attr('stroke', 'rgba(79, 70, 229, 0.6)')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('stroke-linecap', 'round')
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      // Highlight connected nodes
      node.style('opacity', n => 
        n.id === d.id || correspondingNodes.some(cn => cn.id === n.id) ? 1 : 0.2
      );

      // Highlight the hovered node and corresponding nodes
      node.select('circle')
        .transition()
        .duration(200)
        .attr('r', n => 
          n.id === d.id || correspondingNodes.some(cn => cn.id === n.id)
            ? getNodeSize(n.level) * 1.2
            : getNodeSize(n.level)
        );
    })
    .on('mouseout', () => {
      // Remove connection links
      g.selectAll('.connection-link').remove();

      // Reset node opacity and size
      node.style('opacity', 1)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', d => getNodeSize(d.level));
    });

    // Add labels to nodes
    node.append('text')
      .text(d => d.title)
      .attr('x', d => getNodeSize(d.level) + 5)
      .attr('y', 4)
      .attr('class', d => {
        if (d.level === -1) return 'text-lg font-bold';
        if (d.level === 0) return 'text-base font-semibold';
        return 'text-sm';
      })
      .style('fill', '#4a5568')
      .each(function() {
        const bbox = (this as SVGTextElement).getBBox();
        const padding = 2;
        d3.select(this.parentNode)
          .insert('rect', 'text')
          .attr('x', bbox.x - padding)
          .attr('y', bbox.y - padding)
          .attr('width', bbox.width + 2 * padding)
          .attr('height', bbox.height + 2 * padding)
          .attr('fill', 'white')
          .attr('fill-opacity', 0.8);
      });

    simulationRef.current.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      g.selectAll('.connection-link line')
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
    };
  }, [graphData]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.2);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.8);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
  };

  function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
    }
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  return (
    <div className="relative w-full h-[800px] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Vergrößern"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Verkleinern"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-100 rounded-lg text-xs"
          title="Ansicht zurücksetzen"
        >
          Reset
        </button>
      </div>

      {/* Info tooltip */}
      <div className="absolute top-4 right-20 group z-10">
        <div className="p-2 text-gray-500 hover:text-gray-700 cursor-help">
          <Info className="w-5 h-5" />
        </div>
        <div className="hidden group-hover:block absolute right-0 w-64 p-4 bg-white rounded-lg shadow-lg border border-gray-200 text-sm text-gray-600">
          <p className="mb-2">
            Interaktive Visualisierung der Themenbäume:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Zentraler Knoten zeigt den Titel</li>
            <li>4 Hauptzweige für Bildungssektoren</li>
            <li>Zeihen Sie mit der Maus über einen Knoten, um Verbindungen anzuzeigen</li>
            <li>Nutzen Sie die Zoom-Kontrollen oder das Mausrad</li>
            <li>Farben kennzeichnen die Bildungssektoren</li>
          </ul>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: 'grab' }}
      />
    </div>
  );
}