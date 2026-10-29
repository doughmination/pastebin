<!-- src/lib/components/CodeView.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { onMount } from "svelte";

  // `html` is Shiki's output, or the escaped plain fallback, from highlight.ts
  let {
    html,
    numbered,
    light,
  }: {
    html: string;
    numbered: boolean;
    light: boolean;
  } = $props();

  let box: HTMLDivElement;
  let anchorLine: number | null = null;

  export function text(): string {
    return box.innerText.replace(/\n$/, "");
  }

  function lightUp(from: number, to: number) {
    for (const lit of box.querySelectorAll(".line.lit")) lit.classList.remove("lit");
    for (let line = from; line <= to; line++) {
      document.getElementById(`L${line}`)?.classList.add("lit");
    }
    const hash = from === to ? `#L${from}` : `#L${from}-L${to}`;
    history.replaceState(history.state, "", hash);
  }

  // Clicking a line number selects that line and puts it in the address bar. Shift-click extends
  function onclick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const line = target.closest<HTMLElement>(".line");
    if (!line?.id) return;

    // Only the number gutter reacts, so selecting code still works normally
    const gutter = parseFloat(getComputedStyle(line).paddingLeft);
    if (!(event.offsetX >= 0 && event.offsetX < gutter && target === line)) return;

    const number = Number(line.id.slice(1));
    if (!Number.isFinite(number)) return;

    if (event.shiftKey && anchorLine !== null) {
      lightUp(Math.min(anchorLine, number), Math.max(anchorLine, number));
    } else {
      anchorLine = number;
      lightUp(number, number);
    }
    event.preventDefault();
  }

  // Restore a range that arrived in the URL, e.g. #L12-L20
  onMount(() => {
    const range = /^#L(\d+)(?:-L(\d+))?$/.exec(location.hash);
    if (!range) return;

    const from = Number(range[1]);
    const to = range[2] ? Number(range[2]) : from;
    anchorLine = from;
    if (to > from) lightUp(from, to);
    document.getElementById(`L${from}`)?.scrollIntoView({ block: "center" });
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div bind:this={box} class="code" class:numbered class:light {onclick}>
  {@html html}
</div>

<style>
  /* The code surface takes its background from the chosen highlight theme (Shiki
     puts it on the <pre>), and the frame around it from the page accent */
  .code {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    border-top-color: var(--accent-line);
    border-radius: 1rem;
    box-shadow:
      0 0 0 4px var(--accent-dim),
      0 16px 32px -20px rgb(0 0 0 / 80%);
  }

  .code :global(pre.shiki) {
    margin: 0;
    padding: 1rem 0;
    overflow-x: auto;
    font-family: var(--mono);
    font-size: 0.875rem;
    line-height: 1.55;
    tab-size: 2;
  }

  .code :global(pre.sh-plain) {
    background: rgb(0 0 0 / 30%);
    color: var(--text);
  }

  .code :global(pre.shiki code) {
    display: block;
    width: max-content;
    min-width: 100%;
    font-size: inherit;
    counter-reset: line;
  }

  .code :global(.line) {
    display: inline-block;
    position: relative;
    width: 100%;
    padding: 0 1rem;
    scroll-margin-top: 4rem;
  }

  /* Line numbers are a counter rather than markup, so copying the code never picks them up */
  .numbered :global(.line) {
    padding-left: 4.2rem;
  }

  .numbered :global(.line::before) {
    position: absolute;
    left: 0;
    width: 3.4rem;
    padding-right: 0.8rem;
    color: var(--muted);
    text-align: right;
    content: counter(line);
    counter-increment: line;
    opacity: 0.55;
    user-select: none;
  }

  .code :global(.line:target),
  .code :global(.line.lit) {
    background: var(--accent-dim);
    box-shadow: inset 3px 0 0 var(--accent);
  }

  .code :global(.line:target::before),
  .code :global(.line.lit::before) {
    color: var(--accent);
    opacity: 1;
  }

  /* A light theme brings its own pale background, so the gutter and frame follow it */
  .light {
    border-color: rgb(0 0 0 / 18%);
    color-scheme: light;
  }

  .light :global(.line::before) {
    color: #2a1a20;
    opacity: 0.4;
  }

  .light :global(.line:target),
  .light :global(.line.lit) {
    background: rgb(0 0 0 / 7%);
  }

  @media (max-width: 40rem) {
    .numbered :global(.line) {
      padding-left: 3.2rem;
    }

    .numbered :global(.line::before) {
      width: 2.6rem;
      padding-right: 0.6rem;
    }
  }
</style>
