import { render, screen } from '@testing-library/react';
import App from './App';

test('renders carrom master pro title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Carrom Master Pro/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders game mode buttons on menu', () => {
  render(<App />);
  const localBtn = screen.getByText(/Local Multiplayer/i);
  const aiBtn = screen.getByText(/Play vs AI/i);
  expect(localBtn).toBeInTheDocument();
  expect(aiBtn).toBeInTheDocument();
});
