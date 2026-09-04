import StateBox from './StateBox';

export default function TemplatesDemoTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <StateBox label="Inside template.tsx (resets every navigation)" />
      {children}
    </div>
  );
}
