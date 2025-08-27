'use client';

import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Eye, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export function PreviewCard() {
  const { previewText, theme } = useAppStore();
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      toast.success('Preview copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };
  
  return (
    <Card title="Live Preview" icon={<Eye className="w-5 h-5" />}>
      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={previewText}
            readOnly
            rows={8}
            className="w-full resize-none rounded-lg border p-4 text-sm"
            style={{
              backgroundColor: theme.colors.entryBg,
              borderColor: theme.colors.highlight,
              color: theme.colors.entryFg
            }}
            placeholder="Preview will appear here..."
          />
          
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 rounded-md hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: theme.colors.highlight }}
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 text-white" />
          </button>
        </div>
        
        <div className="text-xs opacity-75">
          <p style={{ color: theme.colors.labelFg }}>
            This preview shows how your prompts will be formatted. 
            Update any settings to see changes in real-time.
          </p>
        </div>
      </div>
    </Card>
  );
}
