/**
 * CareerCase × SIH26044 — Questionnaire authoring form for recruiters.
 *
 * Supports creating and editing questionnaires with multiple question types,
 * conservative skill mapping, and optional deterministic scoring policies.
 */

import React, { useState } from 'react';
import type {
  QuestionnaireFormData,
  QuestionnaireQuestionType,
  QuestionnaireScopeDeclaration,
  QuestionnaireScoringPolicy,
  SkillRef,
} from '../types/questionnaire';

interface QuestionFormData {
  question_type: QuestionnaireQuestionType;
  question_text: string;
  choice_options?: Array<{ value: string; label: string }>;
  numeric_min?: number;
  numeric_max?: number;
  skill_refs?: SkillRef[];
  scoring_weight?: number;
}

interface QuestionnaireAuthoringFormProps {
  initialData?: Partial<QuestionnaireFormData>;
  onSubmit: (data: QuestionnaireFormData) => Promise<void>;
  onCancel: () => void;
}

export function QuestionnaireAuthoringForm({
  initialData,
  onSubmit,
  onCancel,
}: QuestionnaireAuthoringFormProps) {
  const [formData, setFormData] = useState<QuestionnaireFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    scope_declaration: initialData?.scope_declaration || 'opportunity_specific',
    questions: initialData?.questions || [],
    scoring_policy: initialData?.scoring_policy,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          question_type: 'text',
          question_text: '',
          skill_refs: [],
        },
      ],
    });
  };

  const updateQuestion = (index: number, updates: Partial<QuestionFormData>) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (formData.questions.length === 0) {
      setError('At least one question is required');
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question_text.trim()) {
        setError(`Question ${i + 1}: Question text is required`);
        return;
      }

      if (
        (q.question_type === 'single_choice' ||
          q.question_type === 'multiple_choice') &&
        (!q.choice_options || q.choice_options.length === 0)
      ) {
        setError(`Question ${i + 1}: Choice options are required`);
        return;
      }

      if (
        q.question_type === 'numeric' &&
        (q.numeric_min == null || q.numeric_max == null)
      ) {
        setError(`Question ${i + 1}: Min and max values are required for numeric questions`);
        return;
      }

      if (
        q.question_type === 'numeric' &&
        q.numeric_min != null &&
        q.numeric_max != null &&
        q.numeric_max <= q.numeric_min
      ) {
        setError(`Question ${i + 1}: Max must be greater than min`);
        return;
      }
    }

    setSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questionnaire');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Create Questionnaire</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              maxLength={300}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              rows={3}
              maxLength={2000}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Scope</label>
            <select
              value={formData.scope_declaration}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  scope_declaration: e.target
                    .value as QuestionnaireScopeDeclaration,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            >
              <option value="opportunity_specific">Opportunity-specific</option>
              <option value="reusable_technical">Reusable technical</option>
              <option value="reusable_soft_skill">Reusable soft skill</option>
            </select>
          </div>
        </div>

        {/* Questions */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Questions</h3>
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Add Question
            </button>
          </div>

          {formData.questions.length === 0 && (
            <p className="text-gray-500 italic">No questions yet. Click "Add Question" to start.</p>
          )}

          <div className="space-y-6">
            {formData.questions.map((question, index) => (
              <QuestionEditor
                key={index}
                index={index}
                question={question}
                onUpdate={(updates) => updateQuestion(index, updates)}
                onRemove={() => removeQuestion(index)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>
    </form>
  );
}

interface QuestionEditorProps {
  index: number;
  question: QuestionFormData;
  onUpdate: (updates: Partial<QuestionFormData>) => void;
  onRemove: () => void;
}

function QuestionEditor({
  index,
  question,
  onUpdate,
  onRemove,
}: QuestionEditorProps) {
  const [showSkillRefs, setShowSkillRefs] = useState(false);

  const addChoiceOption = () => {
    const options = question.choice_options || [];
    onUpdate({
      choice_options: [
        ...options,
        { value: `option_${options.length + 1}`, label: '' },
      ],
    });
  };

  const updateChoice = (
    choiceIndex: number,
    field: 'value' | 'label',
    value: string,
  ) => {
    const options = [...(question.choice_options || [])];
    options[choiceIndex] = { ...options[choiceIndex], [field]: value };
    onUpdate({ choice_options: options });
  };

  const removeChoice = (choiceIndex: number) => {
    onUpdate({
      choice_options: (question.choice_options || []).filter(
        (_, i) => i !== choiceIndex,
      ),
    });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <h4 className="font-semibold">Question {index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 text-sm"
        >
          Remove
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Question Type</label>
        <select
          value={question.question_type}
          onChange={(e) =>
            onUpdate({
              question_type: e.target.value as QuestionnaireQuestionType,
              // Clear type-specific fields
              choice_options: undefined,
              numeric_min: undefined,
              numeric_max: undefined,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
        >
          <option value="text">Text (free response)</option>
          <option value="single_choice">Single choice</option>
          <option value="multiple_choice">Multiple choice</option>
          <option value="numeric">Numeric</option>
          <option value="structured_scenario">Structured scenario</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Question Text <span className="text-red-500">*</span>
        </label>
        <textarea
          value={question.question_text}
          onChange={(e) => onUpdate({ question_text: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          rows={2}
          maxLength={2000}
          required
        />
      </div>

      {/* Type-specific fields */}
      {(question.question_type === 'single_choice' ||
        question.question_type === 'multiple_choice') && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Options</label>
            <button
              type="button"
              onClick={addChoiceOption}
              className="text-sm text-red-600 hover:text-red-700"
            >
              + Add Option
            </button>
          </div>
          <div className="space-y-2">
            {(question.choice_options || []).map((choice, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Value"
                  value={choice.value}
                  onChange={(e) => updateChoice(i, 'value', e.target.value)}
                  className="w-1/3 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                />
                <input
                  type="text"
                  placeholder="Label"
                  value={choice.label}
                  onChange={(e) => updateChoice(i, 'label', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeChoice(i)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {question.question_type === 'numeric' && (
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Min Value</label>
            <input
              type="number"
              value={question.numeric_min ?? ''}
              onChange={(e) =>
                onUpdate({ numeric_min: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Max Value</label>
            <input
              type="number"
              value={question.numeric_max ?? ''}
              onChange={(e) =>
                onUpdate({ numeric_max: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Scoring Weight (optional)
        </label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={question.scoring_weight ?? ''}
          onChange={(e) =>
            onUpdate({
              scoring_weight: e.target.value
                ? parseFloat(e.target.value)
                : undefined,
            })
          }
          className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          disabled={
            question.question_type === 'text' ||
            question.question_type === 'structured_scenario'
          }
        />
        {(question.question_type === 'text' ||
          question.question_type === 'structured_scenario') && (
          <p className="text-xs text-gray-500 mt-1">
            Free-text and scenario questions cannot be auto-scored
          </p>
        )}
      </div>
    </div>
  );
}
