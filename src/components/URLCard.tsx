'use client';

import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Globe } from 'lucide-react';

export function URLCard() {
  const { config, updateConfig } = useAppStore();
  
  return (
    <Card title="URL Configuration" icon={<Globe className="w-5 h-5" />}>
      <div className="space-y-4">
        <Input
          label="Adobe Stock URL:"
          type="url"
          value={config.url}
          onChange={(e) => updateConfig({ url: e.target.value })}
          placeholder="Enter Adobe Stock URL..."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Page:"
            type="number"
            min="1"
            value={config.startPage}
            onChange={(e) => updateConfig({ startPage: parseInt(e.target.value) || 1 })}
          />
          <Input
            label="End Page:"
            type="number"
            min="1"
            value={config.endPage}
            onChange={(e) => updateConfig({ endPage: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>
    </Card>
  );
}
