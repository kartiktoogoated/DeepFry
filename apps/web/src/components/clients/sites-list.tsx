/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface SitesListProps {
  sites: Array<{
    id: number
    url: string
    status: string
    uptime: number
    responseTime: number
    lastChecked: string
  }>
  onSelect: (id: number) => void
  selectedSite: number | null
  onDelete?: () => void
}

const SitesList = ({ sites, onSelect, selectedSite, onDelete }: SitesListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [siteToDelete, setSiteToDelete] = useState<number | null>(null)
  const { toast } = useToast()

  const handleDelete = async (siteId: number) => {
    setSiteToDelete(siteId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!siteToDelete) return

    try {
      const res = await fetch(`/api/websites/${siteToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to delete website')
      }

      toast({ title: 'Website deleted', description: 'The website has been removed from monitoring' })
      onDelete?.()
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to delete website', 
        variant: 'destructive' 
      })
    } finally {
      setDeleteDialogOpen(false)
      setSiteToDelete(null)
    }
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="px-1">
          {sites.map(site => (
            <div
              key={site.id}
              className={cn(
                'flex flex-col space-y-1 px-3 py-2 cursor-pointer',
                'hover:bg-accent hover:text-accent-foreground rounded-md',
                selectedSite === site.id && 'bg-accent text-accent-foreground'
              )}
            >
              <div className="flex justify-between items-start">
                <div 
                  className="max-w-[160px] overflow-hidden flex-1"
                  onClick={() => onSelect(site.id)}
                >
                  <div className="font-medium truncate">
                    {new URL(site.url).hostname}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {site.url}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={site.status === 'online' ? 'default' : 'destructive'}
                  >
                    {site.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(site.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>{site.uptime.toFixed(1)}% uptime</span>
                <span>
                  {site.responseTime > 0 ? `${site.responseTime} ms` : '—'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {site.lastChecked}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this website from monitoring? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default SitesList
