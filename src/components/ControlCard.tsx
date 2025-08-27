'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Play, Square, Eye, FolderOpen, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import axios from 'axios';

export function ControlCard() {
  const { 
    config, 
    isScrapingActive, 
    setScrapingActive, 
    progress, 
    setProgress, 
    theme, 
    updatePreview 
  } = useAppStore();
  
  const [scrapedData, setScrapedData] = useState<string[] | null>(null);
  
  const handleStartScraping = async () => {
    if (isScrapingActive) {
      setScrapingActive(false);
      setProgress({
        currentPage: 0,
        totalPages: 0,
        prompts: 0,
        status: 'idle',
        message: 'Scraping stopped',
        percentage: 0
      });
      return;
    }
    
    // Validation
    if (!config.url.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }
    
    if (config.startPage > config.endPage) {
      toast.error('Start page cannot be greater than end page');
      return;
    }
    
    setScrapingActive(true);
    setScrapedData(null);
    
    const totalPages = config.endPage - config.startPage + 1;
    setProgress({
      currentPage: 0,
      totalPages,
      prompts: 0,
      status: 'scraping',
      message: `Starting scraping of ${totalPages} pages...`,
      percentage: 0
    });
    
    try {
      const response = await axios.post('/api/scrape', {
        url: config.url,
        startPage: config.startPage,
        endPage: config.endPage,
        config: {
          includePrefix: config.includePrefix,
          includeSuffix: config.includeSuffix,
          includeDate: config.includeDate,
          includeParams: config.includeParams,
          includeAspectRatio: config.includeAspectRatio,
          toLowerCase: config.toLowerCase,
          prefix: config.prefix,
          suffix: config.suffix,
          aspectRatio: config.aspectRatio,
          additionalParams: config.additionalParams,
        }
      });
      
      if (response.data.success) {
        setScrapedData(response.data.prompts);
        setProgress({
          currentPage: totalPages,
          totalPages,
          prompts: response.data.prompts.length,
          status: 'complete',
          message: `✅ Completed! Generated ${response.data.prompts.length} prompts`,
          percentage: 100
        });
        toast.success(`Scraping completed! Found ${response.data.prompts.length} prompts`);
      } else {
        throw new Error(response.data.error || 'Scraping failed');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.error || error.message
        : 'Scraping failed';
      
      setProgress({
        currentPage: 0,
        totalPages,
        prompts: 0,
        status: 'error',
        message: `⚠️ Error: ${errorMessage}`,
        percentage: 0
      });
      toast.error(errorMessage);
    } finally {
      setScrapingActive(false);
    }
  };
  
  const handleDownload = () => {
    if (!scrapedData || scrapedData.length === 0) {
      toast.error('No data to download');
      return;
    }
    
    const content = scrapedData.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${config.filename || 'prompts'}_${timestamp}.txt`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, filename);
    toast.success(`Downloaded ${filename}`);
  };
  
  return (
    <Card title="Control Panel" icon={<Play className="w-5 h-5" />}>
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <label 
            className="block text-sm font-medium"
            style={{ color: theme.colors.labelFg }}
          >
            Progress:
          </label>
          <div 
            className="w-full h-6 rounded-lg border overflow-hidden"
            style={{ 
              backgroundColor: theme.colors.entryBg,
              borderColor: theme.colors.highlight
            }}
          >
            <div
              className="h-full progress-bar transition-all duration-500 ease-out flex items-center justify-center text-xs text-white font-semibold"
              style={{ 
                width: `${progress.percentage}%`,
                minWidth: progress.percentage > 0 ? '60px' : '0'
              }}
            >
              {progress.percentage > 0 && `${Math.round(progress.percentage)}%`}
            </div>
          </div>
          <p 
            className="text-sm"
            style={{ color: theme.colors.labelFg }}
          >
            {progress.message}
          </p>
        </div>
        
        {/* Control Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant={isScrapingActive ? 'error' : 'success'}
            onClick={handleStartScraping}
            disabled={!config.url.trim()}
            loading={isScrapingActive}
            icon={isScrapingActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          >
            {isScrapingActive ? 'Stop' : 'Start'}
          </Button>
          
          <Button
            variant="primary"
            onClick={updatePreview}
            icon={<Eye className="w-4 h-4" />}
          >
            Preview
          </Button>
          
          <Button
            variant="warning"
            onClick={handleDownload}
            disabled={!scrapedData || scrapedData.length === 0}
            icon={<Download className="w-4 h-4" />}
          >
            Download
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => window.open('https://github.com', '_blank')}
            icon={<FolderOpen className="w-4 h-4" />}
          >
            GitHub
          </Button>
        </div>
      </div>
    </Card>
  );
}
