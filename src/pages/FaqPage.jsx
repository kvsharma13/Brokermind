import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/shared/TableSkeleton';

const CATEGORIES = ['ORDERS', 'MARGIN', 'KYC', 'GENERAL', 'ACCOUNT'];
const catColors = {
  ORDERS: 'bg-blue-50 text-blue-700 border-blue-200',
  MARGIN: 'bg-amber-50 text-amber-700 border-amber-200',
  KYC: 'bg-purple-50 text-purple-700 border-purple-200',
  GENERAL: 'bg-gray-50 text-gray-600 border-gray-200',
  ACCOUNT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function FaqPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'GENERAL', broker_code: 'BROKER01' });

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => brokermind.entities.FAQ.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => brokermind.entities.FAQ.create({ ...data, faq_id: 'FAQ' + Date.now().toString().slice(-4) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      setDialogOpen(false);
      toast({ title: 'FAQ Created' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => brokermind.entities.FAQ.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      setDialogOpen(false);
      setEditingFaq(null);
      toast({ title: 'FAQ Updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => brokermind.entities.FAQ.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast({ title: 'FAQ Deleted' });
    },
  });

  const openNew = () => {
    setEditingFaq(null);
    setForm({ question: '', answer: '', category: 'GENERAL', broker_code: 'BROKER01' });
    setDialogOpen(true);
  };

  const openEdit = (faq) => {
    setEditingFaq(faq);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, broker_code: faq.broker_code || 'BROKER01' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingFaq) {
      updateMutation.mutate({ id: editingFaq.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage FAQs for the AI agent</p>
        </div>
        <Button size="sm" className="gap-2 bg-[#4F8EF7] hover:bg-[#3d7de0]" onClick={openNew}>
          <Plus className="w-4 h-4" /> New FAQ
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={4} /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Question</TableHead>
                    <TableHead className="text-xs">Answer</TableHead>
                    <TableHead className="text-xs w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map(faq => (
                    <TableRow key={faq.id}>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${catColors[faq.category] || ''}`}>{faq.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[250px]">{faq.question}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[350px] truncate">{faq.answer}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(faq)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteMutation.mutate(faq.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Question</label>
              <Input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Enter the question..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Answer</label>
              <Textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="Enter the answer..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#4F8EF7] hover:bg-[#3d7de0]" onClick={handleSave}>
              {editingFaq ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}