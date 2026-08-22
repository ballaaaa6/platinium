import './styles.css';
import { OfficeApp } from './app.js';

const root = document.querySelector('#app');

if (!root) {
  throw new Error('Office dashboard root element was not found.');
}

new OfficeApp(root);
