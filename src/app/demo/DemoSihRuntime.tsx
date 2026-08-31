import { DemoSihProvider } from '../context/DemoSihContext';
import { DemoLayout } from './DemoLayout';

export function DemoSihRuntime() {
  return (
    <DemoSihProvider>
      <DemoLayout />
    </DemoSihProvider>
  );
}
