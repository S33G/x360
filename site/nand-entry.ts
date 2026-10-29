import { mountNandAnalyzer } from './nand-ui.ts';

declare const __NAND_WORKER_SOURCE__: string;
const container = document.querySelector<HTMLElement>('[data-nand-analyzer]');
if (container) mountNandAnalyzer(container, __NAND_WORKER_SOURCE__);
