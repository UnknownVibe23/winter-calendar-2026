import './styles/base.css';
import './styles/calendar.css';
import { renderCalendar } from './calendar';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app element');
}

renderCalendar(app);
