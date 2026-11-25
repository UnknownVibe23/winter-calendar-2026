import { renderCalendar } from './calendar';
import type { Content } from './content';

export function renderApp(container: HTMLElement, content: Content): void {
  renderCalendar(container);
  const welcome = document.createElement('p');
  welcome.className = 'welcome';
  welcome.textContent = `${content.greeting}, ${content.name}!`;
  const grid = container.querySelector('.calendar-grid');
  if (grid) {
    container.insertBefore(welcome, grid);
  } else {
    container.append(welcome);
  }
}
