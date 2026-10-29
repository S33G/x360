import { boards } from './paths-data.mjs';
import { escapeHtml as e } from './markdown.mjs';

export function pathPickerTemplate() {
  return `<section class="path-picker" aria-label="Find exploit options by motherboard">
    <p class="path-intro">Start with the motherboard. Then compare the software and hardware routes documented for it.</p>
    <form class="board-form">
      <label for="board-select">Your Xbox 360 motherboard</label>
      <select id="board-select" aria-describedby="board-help path-status">
        <option value="">Choose a motherboard…</option>
        <option value="unknown">I’m not sure yet</option>
        ${boards.map(board => `<option value="${e(board.id)}">${e(board.name)}</option>`).join('')}
      </select>
      <p id="board-help">Need to identify it? <a href="https://consolemods.org/wiki/Xbox_360:Motherboard_Information">Use ConsoleMods’ motherboard reference ↗</a></p>
      <p><a href="#compare-the-software-environments">Jump to the softmod feature comparison ↓</a></p>
    </form>
    <p id="path-status" role="status" aria-live="polite">Choose a motherboard to see documented routes and their requirements.</p>
    <div class="path-results"></div>
    <noscript><p>The selector needs JavaScript. The motherboard table and feature comparison below contain the same reading guidance.</p></noscript>
  </section>`;
}
