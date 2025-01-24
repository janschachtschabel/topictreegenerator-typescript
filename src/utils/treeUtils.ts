import { TopicTree, Collection } from '../types/TopicTree';

function hasAlternativeTitle(node: Collection, sector: string): boolean {
  return (
    node.properties.cm_alternative_titles &&
    typeof node.properties.cm_alternative_titles[sector] === 'string' &&
    node.properties.cm_alternative_titles[sector].trim() !== ''
  );
}

function filterNodeBySector(node: Collection, sector: string): Collection | null {
  // Check if this node has a title for the selected sector
  if (!hasAlternativeTitle(node, sector)) {
    return null;
  }

  // If node has subcollections, filter them recursively
  if (node.subcollections && node.subcollections.length > 0) {
    const filteredSubcollections = node.subcollections
      .map(subNode => filterNodeBySector(subNode, sector))
      .filter((subNode): subNode is Collection => subNode !== null);

    return {
      ...node,
      subcollections: filteredSubcollections
    };
  }

  // Node has no subcollections but has a valid title
  return node;
}

export function filterTreeBySector(tree: TopicTree, sector: string): TopicTree {
  const filteredCollection = tree.collection
    .map(node => filterNodeBySector(node, sector))
    .filter((node): node is Collection => node !== null);

  return {
    ...tree,
    collection: filteredCollection
  };
}

export function generateAsciiTree(tree: TopicTree, sector: string = 'allgemeinbildend'): string {
  let result = `${tree.metadata.title}\n`;

  // Define level-specific branch styles
  const branchStyles = {
    0: { branch: '═══', corner: '╔', vertical: '║', lastCorner: '╚', connector: '═' },
    1: { branch: '───', corner: '├', vertical: '│', lastCorner: '└', connector: '─' },
    2: { branch: '   ', corner: ' ', vertical: ' ', lastCorner: ' ', connector: ' ' }
  };

  function addNode(
    node: Collection, 
    prefix: string = '', 
    isLast: boolean = true, 
    currentSector: string = sector,
    level: number = 0,
    maxLevels: Map<number, number> = new Map()
  ): void {
    // Get style for current level
    const style = branchStyles[Math.min(level, 2)];
    
    // Create node prefix based on level
    const nodePrefix = prefix + (isLast ? `${style.lastCorner}${style.branch}` : `${style.corner}${style.branch}`);
    const childPrefix = prefix + (isLast ? '    ' : `${style.vertical}   `);
    
    // Check if this node has a title for the current sector
    const hasTitle = node.properties.cm_alternative_titles?.[currentSector];
    
    if (hasTitle) {
      // Get the sector-specific title
      const title = node.properties.cm_alternative_titles[currentSector];
      // Add level-specific formatting
      const formattedTitle = level === 0 
        ? title.toUpperCase()
        : level === 1
        ? title
        : `    ${title}`;
      result += `${nodePrefix}${formattedTitle}\n`;
    } else {
      // Add vertical line placeholder to maintain alignment
      result += `${prefix}${style.vertical}\n`;
    }

    if (node.subcollections && node.subcollections.length > 0) {
      // Update max levels for this depth
      const currentMax = maxLevels.get(level) || 0;
      maxLevels.set(level, Math.max(currentMax, node.subcollections.length));

      node.subcollections.forEach((child, index) => {
        const isLastChild = index === node.subcollections!.length - 1;
        addNode(child, childPrefix, isLastChild, currentSector, level + 1, maxLevels);
      });
    } else if (!hasTitle) {
      // Add extra vertical line for empty branches to maintain alignment
      result += `${childPrefix}${style.vertical}\n`;
    }
  }

  // First pass: calculate maximum number of nodes at each level
  const maxLevels = new Map<number, number>();
  tree.collection.forEach((node, index) => {
    const isLast = index === tree.collection.length - 1;
    addNode(node, '', isLast, sector, 0, maxLevels);
  });

  // Reset result for second pass
  result = `${tree.metadata.title}\n`;

  // Second pass: generate tree with proper alignment
  tree.collection.forEach((node, index) => {
    const isLast = index === tree.collection.length - 1;
    addNode(node, '', isLast, sector, 0, maxLevels);
  });

  return result;
}