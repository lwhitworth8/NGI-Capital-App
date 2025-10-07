"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NoteItem {
  account_number?: string;
  account_name?: string;
  amount?: number;
  description?: string;
}

interface FinancialNote {
  id?: number;
  entity_id: number;
  statement_type: string;
  note_number: string;
  note_title: string;
  note_content: string;
  is_required: boolean;
  is_custom: boolean;
  note_items: NoteItem[];
}

interface NotesManagerProps {
  entityId: number;
  statementType?: string;
  onNotesChange?: (notes: FinancialNote[]) => void;
}

const STATEMENT_TYPES = [
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'income_statement', label: 'Income Statement' },
  { value: 'cash_flow', label: 'Cash Flow Statement' },
  { value: 'equity', label: 'Equity Statement' },
  { value: 'comprehensive_income', label: 'Comprehensive Income' }
];

export default function NotesManager({ entityId, statementType, onNotesChange }: NotesManagerProps) {
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<FinancialNote | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    statement_type: statementType || 'balance_sheet',
    note_number: '',
    note_title: '',
    note_content: '',
    is_required: false,
    is_custom: true
  });

  const [noteItems, setNoteItems] = useState<NoteItem[]>([]);

  useEffect(() => {
    loadNotes();
    loadTemplates();
  }, [entityId, statementType]);

  const loadNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (statementType) params.append('statement_type', statementType);
      
      const response = await fetch(`/api/accounting/notes/${entityId}?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
        onNotesChange?.(data.notes || []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/accounting/notes/templates/required', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSaveNote = async () => {
    try {
      const noteData = {
        ...formData,
        entity_id: entityId,
        note_items: noteItems
      };

      const url = editingNote ? `/api/accounting/notes/${editingNote.id}` : '/api/accounting/notes/';
      const method = editingNote ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(noteData)
      });

      if (response.ok) {
        await loadNotes();
        resetForm();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/accounting/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleUseTemplate = (template: any) => {
    setFormData({
      statement_type: template.statement_type,
      note_number: template.note_number,
      note_title: template.note_title,
      note_content: template.note_content,
      is_required: template.is_required,
      is_custom: false
    });
    setNoteItems([]);
  };

  const resetForm = () => {
    setFormData({
      statement_type: statementType || 'balance_sheet',
      note_number: '',
      note_title: '',
      note_content: '',
      is_required: false,
      is_custom: true
    });
    setNoteItems([]);
    setEditingNote(null);
  };

  const addNoteItem = () => {
    setNoteItems([...noteItems, { account_number: '', account_name: '', amount: 0, description: '' }]);
  };

  const updateNoteItem = (index: number, field: keyof NoteItem, value: any) => {
    const updated = [...noteItems];
    updated[index] = { ...updated[index], [field]: value };
    setNoteItems(updated);
  };

  const removeNoteItem = (index: number) => {
    setNoteItems(noteItems.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading notes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Notes to Financial Statements</h3>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingNote ? 'Edit Note' : 'Add New Note'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Statement Type</label>
                    <Select 
                      value={formData.statement_type} 
                      onValueChange={(value) => setFormData({...formData, statement_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATEMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Note Number</label>
                    <Input
                      value={formData.note_number}
                      onChange={(e) => setFormData({...formData, note_number: e.target.value})}
                      placeholder="e.g., 1, 2, 3"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Note Title</label>
                  <Input
                    value={formData.note_title}
                    onChange={(e) => setFormData({...formData, note_title: e.target.value})}
                    placeholder="e.g., Summary of Significant Accounting Policies"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Note Content</label>
                  <Textarea
                    value={formData.note_content}
                    onChange={(e) => setFormData({...formData, note_content: e.target.value})}
                    placeholder="Enter the detailed note content..."
                    rows={6}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_required"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({...formData, is_required: e.target.checked})}
                  />
                  <label htmlFor="is_required" className="text-sm font-medium">
                    Required by GAAP
                  </label>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Note Items (Optional)</label>
                    <Button type="button" variant="outline" size="sm" onClick={addNoteItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {noteItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 p-3 border rounded">
                        <Input
                          placeholder="Account #"
                          value={item.account_number || ''}
                          onChange={(e) => updateNoteItem(index, 'account_number', e.target.value)}
                        />
                        <Input
                          placeholder="Account Name"
                          value={item.account_name || ''}
                          onChange={(e) => updateNoteItem(index, 'account_name', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount || ''}
                          onChange={(e) => updateNoteItem(index, 'amount', parseFloat(e.target.value) || 0)}
                        />
                        <div className="flex gap-1">
                          <Input
                            placeholder="Description"
                            value={item.description || ''}
                            onChange={(e) => updateNoteItem(index, 'description', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeNoteItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNote}>
                    {editingNote ? 'Update Note' : 'Create Note'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates Section */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Required GAAP Note Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {templates
                .filter(t => !statementType || t.statement_type === statementType)
                .map((template, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{template.note_title}</div>
                    <div className="text-sm text-gray-600">{template.statement_type.replace('_', ' ')} - Note {template.note_number}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={note.is_required ? "destructive" : "secondary"}>
                          Note {note.note_number}
                        </Badge>
                        <Badge variant="outline">
                          {note.statement_type.replace('_', ' ')}
                        </Badge>
                        {note.is_required && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Required
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-semibold mb-2">{note.note_title}</h4>
                      <p className="text-sm text-gray-700 mb-3">{note.note_content}</p>
                      
                      {note.note_items && note.note_items.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium mb-2">Note Items:</div>
                          <div className="space-y-1">
                            {note.note_items.map((item, index) => (
                              <div key={index} className="text-sm text-gray-600">
                                {item.account_number && `${item.account_number} - `}
                                {item.account_name}
                                {item.amount && `: $${item.amount.toLocaleString()}`}
                                {item.description && ` (${item.description})`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingNote(note);
                          setFormData({
                            statement_type: note.statement_type,
                            note_number: note.note_number,
                            note_title: note.note_title,
                            note_content: note.note_content,
                            is_required: note.is_required,
                            is_custom: note.is_custom
                          });
                          setNoteItems(note.note_items);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {notes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No notes added yet. Click "Add Note" to create your first note.
          </div>
        )}
      </div>
    </div>
  );
}




