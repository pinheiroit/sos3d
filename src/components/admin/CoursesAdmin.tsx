import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Film, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  createMediaUploadUrl,
  deleteCourse,
  deleteLesson,
  saveCourse,
  saveLesson,
} from "@/lib/courses.functions";

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string | null;
  resource_url: string | null;
  duration_min: number;
  sort_order: number;
};

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  cover_key: string;
  published: boolean;
  sort_order: number;
  lessons: Lesson[];
};

type CourseForm = Omit<Course, "id" | "lessons">;
type LessonForm = Omit<Lesson, "id">;

const emptyCourse: CourseForm = {
  slug: "",
  title: "",
  description: "",
  level: "Iniciante",
  cover_key: "printer-1",
  published: true,
  sort_order: 0,
};

function emptyLesson(courseId: string, sortOrder: number): LessonForm {
  return {
    course_id: courseId,
    title: "",
    description: "",
    video_url: null,
    resource_url: null,
    duration_min: 0,
    sort_order: sortOrder,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Envia o arquivo direto ao storage usando URL assinada (aceita vídeos grandes). */
function MediaUpload({
  value,
  onChange,
  accept,
  label,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  accept: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 1_500_000_000) {
      toast.error("Arquivo muito grande", { description: "Limite de 1,5GB por arquivo." });
      return;
    }
    setBusy(true);
    try {
      const signed = (await createMediaUploadUrl({
        data: { fileName: file.name },
      } as never)) as { bucket: string; path: string; token: string };

      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);

      onChange(`storage:${signed.path}`);
      toast.success("Arquivo enviado");
    } catch (e) {
      toast.error("Falha no envio", { description: (e as Error).message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Upload />} {label}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 /> Remover
          </Button>
        )}
      </div>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Ou cole um link (YouTube, Vimeo, PDF…)"
      />
      {value?.startsWith("storage:") && (
        <p className="text-xs text-muted-foreground">Arquivo hospedado no portal (acesso restrito a membros).</p>
      )}
    </div>
  );
}

export function CoursesAdmin({ courses }: { courses: Course[] }) {
  const queryClient = useQueryClient();
  const [courseForm, setCourseForm] = useState<CourseForm | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["portal"] });
  };

  const courseMutation = useMutation({
    mutationFn: (payload: { id: string | null; values: CourseForm }) =>
      saveCourse({ data: payload } as never),
    onSuccess: () => {
      toast.success("Curso salvo");
      setCourseForm(null);
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const lessonMutation = useMutation({
    mutationFn: (payload: { id: string | null; values: LessonForm }) =>
      saveLesson({ data: payload } as never),
    onSuccess: () => {
      toast.success("Aula salva");
      setLessonForm(null);
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const removeCourse = useMutation({
    mutationFn: (id: string) => deleteCourse({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Curso removido");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  const removeLesson = useMutation({
    mutationFn: (id: string) => deleteLesson({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Aula removida");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Publique cursos, envie vídeos e materiais de apoio para os membros do portal.
        </p>
        <Button
          variant="cta"
          onClick={() => {
            setCourseId(null);
            setCourseForm({ ...emptyCourse, sort_order: courses.length });
          }}
        >
          <Plus /> Novo curso
        </Button>
      </div>

      {courses.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum curso cadastrado ainda.
        </div>
      )}

      <div className="space-y-4">
        {[...courses]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((course) => (
            <article key={course.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={course.published ? "secondary" : "outline"}>
                    {course.published ? course.level : "Rascunho"}
                  </Badge>
                  <h3 className="text-lg font-bold">{course.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    {course.lessons.length} aula(s)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCourseId(course.id);
                      const { id: _id, lessons: _lessons, ...rest } = course;
                      setCourseForm(rest);
                    }}
                  >
                    <Pencil /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="tech"
                    onClick={() => {
                      setLessonId(null);
                      setLessonForm(emptyLesson(course.id, course.lessons.length));
                    }}
                  >
                    <Plus /> Aula
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Remover o curso "${course.title}" e suas aulas?`)) {
                        removeCourse.mutate(course.id);
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              {course.description && (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{course.description}</p>
              )}

              <ul className="mt-4 space-y-2">
                {[...course.lessons]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Film className="size-4 text-tech" />
                        <div>
                          <p className="text-sm font-medium">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.duration_min} min
                            {lesson.video_url ? " · vídeo" : " · sem vídeo"}
                            {lesson.resource_url ? " · material" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLessonId(lesson.id);
                            const { id: _id, ...rest } = lesson;
                            setLessonForm(rest);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remover a aula "${lesson.title}"?`)) {
                              removeLesson.mutate(lesson.id);
                            }
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
      </div>

      <Dialog open={courseForm !== null} onOpenChange={(open) => !open && setCourseForm(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{courseId ? "Editar curso" : "Novo curso"}</DialogTitle>
          </DialogHeader>
          {courseForm && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        title: e.target.value,
                        slug: courseId ? courseForm.slug : slugify(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={courseForm.slug}
                    onChange={(e) => setCourseForm({ ...courseForm, slug: slugify(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível</Label>
                  <Input
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={courseForm.sort_order}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, sort_order: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={4}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Publicado</p>
                  <p className="text-xs text-muted-foreground">Visível para membros ativos.</p>
                </div>
                <Switch
                  checked={courseForm.published}
                  onCheckedChange={(v) => setCourseForm({ ...courseForm, published: v })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCourseForm(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="cta"
                  disabled={courseMutation.isPending}
                  onClick={() => courseMutation.mutate({ id: courseId, values: courseForm })}
                >
                  {courseMutation.isPending && <Loader2 className="animate-spin" />} Salvar curso
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={lessonForm !== null} onOpenChange={(open) => !open && setLessonForm(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{lessonId ? "Editar aula" : "Nova aula"}</DialogTitle>
          </DialogHeader>
          {lessonForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input
                    type="number"
                    value={lessonForm.duration_min}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, duration_min: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={lessonForm.sort_order}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, sort_order: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Vídeo da aula</Label>
                <MediaUpload
                  accept="video/mp4,video/webm,video/quicktime"
                  label="Enviar vídeo"
                  value={lessonForm.video_url}
                  onChange={(v) => setLessonForm({ ...lessonForm, video_url: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Material de apoio</Label>
                <MediaUpload
                  accept="application/pdf,application/zip,image/*"
                  label="Enviar material"
                  value={lessonForm.resource_url}
                  onChange={(v) => setLessonForm({ ...lessonForm, resource_url: v })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setLessonForm(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="cta"
                  disabled={lessonMutation.isPending}
                  onClick={() => lessonMutation.mutate({ id: lessonId, values: lessonForm })}
                >
                  {lessonMutation.isPending && <Loader2 className="animate-spin" />} Salvar aula
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
