'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { VideoPlayer } from './VideoPlayer';
import { CheckCircle, Clock, BookOpen, Target, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { learningAPI } from '@/lib/api/learning';

interface LessonContentProps {
  content: {
    id: number;
    title: string;
    content_type: string;
    content_markdown?: string;
    content_url?: string;
    estimated_duration_minutes?: number;
    difficulty_level?: string;
    animation_id?: string;
    interactive_tool_id?: string;
    prerequisites: string[];
    tags: string[];
  };
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  isCompleted?: boolean;
}

export function LessonContent({ 
  content, 
  onComplete, 
  onProgress, 
  isCompleted = false 
}: LessonContentProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isMarkedComplete, setIsMarkedComplete] = useState(isCompleted);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderCancelled, setRenderCancelled] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [thumbAvailable, setThumbAvailable] = useState<boolean>(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const { getToken } = useAuth();

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setScrollProgress(Math.min(scrollPercent, 100));
      
      // Auto-mark as complete after 80% scroll + 15 seconds dwell time
      if (scrollPercent > 80 && timeSpent > 15 && !isMarkedComplete) {
        setIsMarkedComplete(true);
        onComplete?.();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [timeSpent, isMarkedComplete, onComplete]);

  // Track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Mark as complete manually
  const handleMarkComplete = () => {
    setIsMarkedComplete(true);
    onComplete?.();
  };

  const renderContent = () => {
    switch (content.content_type) {
      case 'video':
        return content.animation_id ? (
          <VideoPlayer
            animationId={renderJobId || content.animation_id}
            onComplete={handleMarkComplete}
            onProgress={onProgress}
            className="w-full h-96"
          />
        ) : (
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Video content not available</p>
          </div>
        );

      case 'animation':
        return content.animation_id ? (
          <VideoPlayer
            animationId={renderJobId || content.animation_id}
            onComplete={handleMarkComplete}
            onProgress={onProgress}
            className="w-full h-96"
          />
        ) : (
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Animation not available</p>
          </div>
        );

      case 'interactive':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Interactive Exercise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Interactive tool: {content.interactive_tool_id}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  This interactive exercise will be implemented in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'text':
      default:
        return (
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {content.content_markdown ? (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: content.content_markdown.replace(/\n/g, '<br/>') 
                }} 
              />
            ) : (
              <p className="text-gray-500">Content not available</p>
            )}
          </div>
        );
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current as unknown as number);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const handleQueueRender = async () => {
    try {
      setRenderStatus('queuing');
      setRenderCancelled(false);
      setThumbAvailable(true);
      const token = (await getToken()) || '';
      // We pass animation_id as the scene_name
      const { job_id } = await learningAPI.queueAnimationRender(content.animation_id as string, token);
      setRenderJobId(job_id);
      setRenderStatus('queued');
      // Start polling status
      const poll = async () => {
        if (!job_id || renderCancelled) return;
        try {
          const tokenInner = (await getToken()) || '';
          const s = await learningAPI.getRenderStatus(job_id, tokenInner);
          setRenderStatus(s.status);
          setRenderProgress(typeof s.progress === 'number' ? s.progress : 0);
          if (s.status === 'completed' || s.status === 'failed') {
            stopPolling();
            return;
          }
        } catch (e) {
          // keep trying for transient failures
        }
        pollRef.current = setTimeout(poll, 2000) as unknown as NodeJS.Timeout;
      };
      pollRef.current = setTimeout(poll, 1500) as unknown as NodeJS.Timeout;
    } catch (e) {
      setRenderStatus('error');
    }
  };

  const handleCancelRender = async () => {
    setRenderCancelled(true);
    stopPolling();
    // Best-effort cleanup if already completed
    try {
      if (renderJobId) {
        const token = (await getToken()) || '';
        await learningAPI.deleteAnimation(renderJobId, token);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Lesson Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{content.title}</h1>
            
            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {content.estimated_duration_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{content.estimated_duration_minutes} min</span>
                </div>
              )}
              
              {content.difficulty_level && (
                <Badge variant="outline" className="capitalize">
                  {content.difficulty_level}
                </Badge>
              )}
              
              {content.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{content.tags.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Completion Status */}
          <div className="flex items-center gap-2">
            {isMarkedComplete ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            ) : (
              <Button
                onClick={handleMarkComplete}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Mark Complete
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-muted-foreground">{Math.round(scrollProgress)}%</span>
          </div>
          <Progress value={scrollProgress} className="h-2" />
        </div>
      </div>

      {/* Prerequisites */}
      {content.prerequisites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4" />
              Prerequisites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {content.prerequisites.map((prereq, index) => (
                <Badge key={index} variant="secondary">
                  {prereq}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {content.animation_id && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {renderStatus ? `Render status: ${renderStatus}${renderStatus === 'rendering' ? ` • ${Math.round(renderProgress)}%` : ''}` : 'You can render the latest animation preview.'}
              </div>
              {!renderJobId ? (
                <Button size="sm" variant="outline" onClick={handleQueueRender}>
                  Render animation
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {renderStatus && renderStatus !== 'completed' && renderStatus !== 'failed' && (
                    <Button size="sm" variant="ghost" onClick={handleCancelRender}>
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setShowPreview((v) => !v)}>
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                </div>
              )}
            </div>
            {(renderStatus === 'queued' || renderStatus === 'rendering') && (
              <div>
                <Progress value={renderProgress} className="h-2" />
              </div>
            )}
            {showPreview && renderJobId && (
              <div className="flex items-center gap-4">
                <div className="w-48 h-28 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex items-center justify-center">
                  {thumbAvailable ? (
                    <img
                      src={learningAPI.getAnimationThumbnailUrl(renderJobId)}
                      alt="Animation thumbnail"
                      className="w-full h-full object-cover"
                      onError={() => setThumbAvailable(false)}
                    />
                  ) : (
                    <div className="text-xs text-gray-500">No thumbnail available</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {renderStatus === 'completed' ? 'Ready to play above.' : 'Will be playable once completed.'}
                </div>
              </div>
            )}
          </div>
        )}
        {renderContent()}
      </div>

      {/* Completion Actions */}
      {!isMarkedComplete && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {scrollProgress > 80 ? (
                  <span className="text-green-600">
                    ✓ Ready to mark as complete
                  </span>
                ) : (
                  <span>
                    Scroll to {Math.max(80 - Math.round(scrollProgress), 0)}% more to auto-complete
                  </span>
                )}
              </div>
              <Button
                onClick={handleMarkComplete}
                disabled={scrollProgress < 80}
                className="bg-primary hover:bg-primary/90"
              >
                Mark Complete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Tracking */}
      <div className="text-xs text-muted-foreground text-center">
        Time spent: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
      </div>
    </div>
  );
}
