'use client';

import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Settings, Dice1 } from 'lucide-react';

export function FormatCard() {
  const { config, updateConfig, generateRandomPrefix, theme } = useAppStore();
  
  const options = [
    { key: 'includePrefix', label: '📝 Include Prefix', value: config.includePrefix },
    { key: 'includeSuffix', label: '📎 Include Suffix', value: config.includeSuffix },
    { key: 'includeDate', label: '📅 Include Date', value: config.includeDate },
    { key: 'includeParams', label: '⚡ Include Parameters', value: config.includeParams },
    { key: 'includeAspectRatio', label: '📐 Include Aspect Ratio', value: config.includeAspectRatio },
    { key: 'toLowerCase', label: '🔤 Convert to Lowercase', value: config.toLowerCase },
  ];
  
  return (
    <Card title="Format Settings" icon={<Settings className="w-5 h-5" />}>
      <div className="space-y-6">
        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option) => (
            <label key={option.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox-custom"
                checked={option.value}
                onChange={(e) => updateConfig({ [option.key]: e.target.checked })}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: theme.colors.labelFg }}
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
        
        {/* Input Fields */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Prefix:"
                value={config.prefix}
                onChange={(e) => updateConfig({ prefix: e.target.value })}
                placeholder="Enter prefix..."
              />
            </div>
            <div className="pt-7">
              <Button
                variant="warning"
                size="sm"
                icon={<Dice1 className="w-4 h-4" />}
                onClick={generateRandomPrefix}
              >
                Generate
              </Button>
            </div>
          </div>
          
          <Input
            label="Suffix:"
            value={config.suffix}
            onChange={(e) => updateConfig({ suffix: e.target.value })}
            placeholder="Enter suffix..."
          />
          
          <Input
            label="Aspect Ratio:"
            value={config.aspectRatio}
            onChange={(e) => updateConfig({ aspectRatio: e.target.value })}
            placeholder="e.g., 16:9"
          />
          
          <Input
            label="Additional Parameters:"
            value={config.additionalParams}
            onChange={(e) => updateConfig({ additionalParams: e.target.value })}
            placeholder="e.g., --no dust --p 5y3izqx"
          />
          
          <Input
            label="Filename:"
            value={config.filename}
            onChange={(e) => updateConfig({ filename: e.target.value })}
            placeholder="output"
          />
        </div>
      </div>
    </Card>
  );
}
