import { SparkleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

export function DeepAnalysisDialog({
  open,
  onOpenChange,
  analysisPrompt,
  onAnalysisPromptChange,
  isRunning,
  onRun,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisPrompt: string;
  onAnalysisPromptChange: (value: string) => void;
  isRunning: boolean;
  onRun: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deep analysis</DialogTitle>
          <DialogDescription>
            Searches the live sandbox filesystem for files matching your prompt. Unlike Quick mode which only uses
            pre-indexed data, Deep mode can find any file in the repository.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={analysisPrompt}
          onChange={(e) => onAnalysisPromptChange(e.target.value)}
          className="min-h-40"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="default"
            disabled={isRunning || !analysisPrompt.trim()}
            onClick={() => {
              onRun();
              onOpenChange(false);
            }}
          >
            <SparkleIcon weight="bold" />
            {isRunning ? 'Queuing…' : 'Run deep analysis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
