import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none prose-a:text-red-500 hover:prose-a:text-red-600 prose-headings:font-heading prose-headings:font-bold prose-img:rounded-xl prose-img:shadow-lg", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
