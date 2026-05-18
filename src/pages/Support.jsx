import React, { useState } from 'react';
import { brokermind } from '@/api/brokermindClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { MessageCircleQuestion } from 'lucide-react';

const EMPTY_FORM = { name: '', phone: '', query: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Full name is required.';
  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (!form.query.trim()) {
    errors.query = 'Query is required.';
  } else if (form.query.trim().length < 10) {
    errors.query = 'Query must be at least 10 characters.';
  }
  return errors;
}

export default function Support() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    await brokermind.entities.SupportQuery.create({
      name: form.name.trim(),
      phone: form.phone.trim(),
      query: form.query.trim(),
      submitted_at: new Date().toISOString(),
      status: 'OPEN',
    });
    toast({
      title: 'Query submitted successfully.',
      description: 'Our team will get back to you shortly.',
    });
    setForm(EMPTY_FORM);
    setErrors({});
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit a support query and our team will review and respond shortly.</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Customer Query Form</CardTitle>
            </div>
            <CardDescription className="text-xs">All fields marked are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="query">Customer Query <span className="text-destructive">*</span></Label>
                <Textarea
                  id="query"
                  value={form.query}
                  onChange={e => set('query', e.target.value)}
                  placeholder="Describe your query in detail..."
                  rows={4}
                />
                {errors.query && <p className="text-xs text-destructive">{errors.query}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit Query'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}