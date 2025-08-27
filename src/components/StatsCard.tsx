'use client';

import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { BarChart3, Clock, FileText, CheckCircle } from 'lucide-react';

export function StatsCard() {
  const { progress, theme } = useAppStore();
  
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'scraping':
        return <Clock className="w-5 h-5" style={{ color: theme.colors.warning }} />;
      case 'complete':
        return <CheckCircle className="w-5 h-5" style={{ color: theme.colors.success }} />;
      case 'error':
        return <FileText className="w-5 h-5" style={{ color: theme.colors.error }} />;
      default:
        return <BarChart3 className="w-5 h-5" style={{ color: theme.colors.labelFg }} />;
    }
  };
  
  const getStatusColor = () => {
    switch (progress.status) {
      case 'scraping':
        return theme.colors.warning;
      case 'complete':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.labelFg;
    }
  };
  
  return (
    <Card title="Statistics" icon={<BarChart3 className="w-5 h-5" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.colors.highlight}20` }}>
            <div className="text-2xl font-bold" style={{ color: theme.colors.highlight }}>
              {progress.totalPages}
            </div>
            <div className="text-xs" style={{ color: theme.colors.labelFg }}>
              Total Pages
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${theme.colors.success}20` }}>
            <div className="text-2xl font-bold" style={{ color: theme.colors.success }}>
              {progress.prompts}
            </div>
            <div className="text-xs" style={{ color: theme.colors.labelFg }}>
              Prompts Generated
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span 
              className="text-sm font-medium capitalize"
              style={{ color: getStatusColor() }}
            >
              Status: {progress.status}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span style={{ color: theme.colors.labelFg }}>
                Progress
              </span>
              <span style={{ color: theme.colors.labelFg }}>
                {progress.currentPage} / {progress.totalPages}
              </span>
            </div>
            
            <div 
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: theme.colors.entryBg }}
            >
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{ 
                  width: `${progress.percentage}%`,
                  backgroundColor: theme.colors.success
                }}
              />
            </div>
          </div>
          
          <div className="text-xs pt-2 border-t" style={{ 
            color: theme.colors.labelFg,
            borderColor: `${theme.colors.highlight}30`
          }}>
            <p className="mb-1">
              📋 {progress.status === 'idle' ? 'Ready to scrape' : progress.message}
            </p>
            <p>
              🌐 V2.0 Web Version • Deployed on Vercel
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
