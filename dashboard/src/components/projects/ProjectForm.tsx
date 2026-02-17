import { useState, useEffect } from 'react';
import type { ProjectResponse } from '@agenttailor/shared';
import { Button, Input, Modal, TextArea } from '../ui';
import { useCreateProject, useUpdateProject } from '../../hooks/useProjects';
import { useToast } from '../../hooks/useToast';

export interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  /** Pass a project to enable edit mode; omit for create mode */
  project?: ProjectResponse;
}

interface FormValues {
  name: string;
  description: string;
}

interface FormErrors {
  name?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = 'Name is required';
  } else if (values.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (values.name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }
  return errors;
}

export function ProjectForm({ open, onClose, project }: ProjectFormProps) {
  const isEdit = Boolean(project);
  const { toast } = useToast();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [values, setValues] = useState<FormValues>({
    name: project?.name ?? '',
    description: project?.description ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when modal opens/closes or project changes
  useEffect(() => {
    if (open) {
      setValues({
        name: project?.name ?? '',
        description: project?.description ?? '',
      });
      setErrors({});
      setTouched({});
    }
  }, [open, project]);

  const handleChange = (field: keyof FormValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched[field]) {
      setErrors(validate(next));
    }
  };

  const handleBlur = (field: keyof FormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched: Record<string, boolean> = { name: true, description: true };
    setTouched(allTouched);
    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      if (isEdit && project) {
        await updateProject.mutateAsync({
          id: project.id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
        });
        toast.success('Project updated successfully');
      } else {
        await createProject.mutateAsync({
          name: values.name.trim(),
          description: values.description.trim() || undefined,
        });
        toast.success('Project created successfully');
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    }
  };

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'New Project'}
      footer={
        <>
          <Button variant="outline" size="md" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={isPending}
            onClick={handleSubmit}
          >
            {isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Project Name"
          placeholder="e.g. My AI Assistant"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          error={touched['name'] ? errors.name : undefined}
          required
          autoFocus
        />
        <TextArea
          label="Description"
          placeholder="What is this project for? (optional)"
          value={values.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          rows={4}
        />
      </form>
    </Modal>
  );
}
