/** Enhance ordinary H2 eras / H3 dated milestones without a second content source. */
export function renderTimeline(tokens, render, escapeHtml) {
  const headingAt = (index, tag) => tokens[index]?.type === 'heading_open' && tokens[index].tag === tag && tokens[index].level === 0;
  const starts = tokens.flatMap((_, index) => headingAt(index, 'h2') ? [index] : []);
  if (!starts.length) return render(tokens);
  const intro = render(tokens.slice(0, starts[0]));
  const eras = [];
  let total = 0;
  const sections = starts.map((start, index) => {
    const end = starts[index + 1] ?? tokens.length;
    const milestones = [];
    for (let at = start + 3; at < end; at++) if (headingAt(at, 'h3')) milestones.push(at);
    // Ordinary sections, including a concluding explanation, remain ordinary Markdown.
    if (!milestones.length || milestones.some(at => !tokens[at + 1]?.content.includes(' — '))) return render(tokens.slice(start, end));
    const heading = render(tokens.slice(start, start + 3));
    eras.push({ id: tokens[start].attrGet('id'), title: tokens[start + 1].content });
    const lead = render(tokens.slice(start + 3, milestones[0]));
    const entries = milestones.map((at, milestoneIndex) => {
      const [date, ...titleParts] = tokens[at + 1].content.split(' — ');
      const title = titleParts.join(' — ');
      // Let the shared renderer assign the same complete-heading anchor as GitHub.
      render(tokens.slice(at, at + 3));
      const id = tokens[at].attrGet('id');
      const body = render(tokens.slice(at + 3, milestones[milestoneIndex + 1] ?? end))
        .replace(/<p><strong>(Legacy(?: release| vulnerability)?|Beta):<\/strong>/g, (_, label) =>
          `<p><strong class="timeline-status is-${label === 'Beta' ? 'beta' : 'legacy'}">${label}</strong>`);
      total++;
      return `<li class="timeline-event"><div class="timeline-date">${escapeHtml(date)}</div><article class="timeline-card" aria-labelledby="${escapeHtml(id)}"><h3 id="${escapeHtml(id)}"><span class="sr-only">${escapeHtml(date)} — </span>${escapeHtml(title)}</h3>${body}</article></li>`;
    }).join('');
    return `<section class="timeline-era">${heading}${lead}<ol class="timeline-events">${entries}</ol></section>`;
  }).join('');
  const jumpLinks = eras.map(era => `<a href="#${escapeHtml(era.id)}">${escapeHtml(era.title)} <span aria-hidden="true">↓</span></a>`).join('');
  return `${intro}<div class="timeline-overview"><p><strong>${total} milestones</strong><span>Newest first · Dates may describe a release, disclosure or documented check.</span></p><nav class="timeline-jumps" aria-label="Timeline eras">${jumpLinks}</nav></div><div class="exploit-timeline">${sections}</div>`;
}
