import { TopicTree, Collection } from '../types/TopicTree';

export function generateAsciiTree(tree: TopicTree): string {
  let result = `${tree.metadata.title}\n`;

  function addNode(node: Collection, prefix: string = '', isLast: boolean = true): void {
    const nodePrefix = prefix + (isLast ? '└── ' : '├── ');
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    
    result += `${nodePrefix}${node.title}\n`;

    if (node.subcollections && node.subcollections.length > 0) {
      node.subcollections.forEach((child, index) => {
        const isLastChild = index === node.subcollections!.length - 1;
        addNode(child, childPrefix, isLastChild);
      });
    }
  }

  tree.collection.forEach((node, index) => {
    const isLast = index === tree.collection.length - 1;
    addNode(node, '', isLast);
  });

  return result;
}