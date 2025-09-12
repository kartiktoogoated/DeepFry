import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface Website {
  id: string;
  url: string;
  description?: string;
  paused: boolean;
  createdAt: string;
  userId: string;
}

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 
   * Called with the full Website record returned 
   * by POST /api/websites 
   **/
  onAdd: (website: Website) => void;
}

const AddSiteDialog = ({ open, onOpenChange, onAdd }: AddSiteDialogProps) => {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    // validate URL
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL including http:// or https://');
      return;
    }

    setIsValidating(true);

    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim(), description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to add website');
      } else {
        // call onAdd with the created Website record
        onAdd(data.website as Website);

        // reset form
        setUrl('');
        setDescription('');
        onOpenChange(false);
      }
    } catch {
      setError('Unexpected error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a New Website</DialogTitle>
          <DialogDescription>
            Enter the URL and a short description for the website you want to monitor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g. My blog homepage"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError('');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isValidating}>
              {isValidating ? 'Adding...' : 'Add Website'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSiteDialog;
