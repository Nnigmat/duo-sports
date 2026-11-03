import { useState } from "react";
import type {
  CoachComment,
  Pose,
  Technique,
} from "../../../../../../shared/types";
import { Badge } from "../../../../ui/Badge/Badge";
import { Card } from "../../../../ui/Card/Card";
import { Icon } from "../../../../ui/Icon/Icon";
import { IconButton } from "../../../../ui/IconButton/IconButton";
import { Sheet } from "../../../../ui/Sheet/Sheet";
import { Text } from "../../../../ui/Text/Text";
import { Chibi } from "../../chibi/Chibi";
import { formatCommentDate, hasTechnique } from "../../flow";
import styles from "./TechSheet.module.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Название упражнения */
  title: string;
  pose: Pose;
  technique: Technique;
  /** Последний комментарий тренера к упражнению */
  comment?: CoachComment;
  /** Сколько всего комментариев к упражнению */
  commentsCount: number;
  onOpenComments: () => void;
  /** Для даты комментария; в приложении не передаётся */
  now?: Date;
};

export function TechSheet({
  open,
  onOpenChange,
  title,
  pose,
  technique,
  comment,
  commentsCount,
  onOpenComments,
  now,
}: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Техника"
      title={title}
      tall
    >
      {/* Состояние вкладки и анимации сбрасывается при каждом открытии */}
      <TechBody
        pose={pose}
        technique={technique}
        comment={comment}
        commentsCount={commentsCount}
        onOpenComments={onOpenComments}
        now={now}
      />
    </Sheet>
  );
}

type BodyProps = Omit<Props, "open" | "onOpenChange" | "title">;

function TechBody({
  pose,
  technique,
  comment,
  commentsCount,
  onOpenComments,
  now = new Date(),
}: BodyProps) {
  const [paused, setPaused] = useState(false);
  // Смена key перезапускает CSS-анимацию с начала
  const [run, setRun] = useState(0);

  const filled = hasTechnique(technique);

  return (
    <>
      {filled && (
        <>
          <div className={styles.media}>
            <Chibi
              key={run}
              pose={pose}
              size={196}
              speed={0.5}
              paused={paused}
              className={styles.chibi}
            />
            <span className={styles.speed}>Замедленно · 0,5×</span>
            <div className={styles.controls}>
              <IconButton
                icon="replay"
                aria-label="Повторить"
                onClick={() => {
                  setRun((n) => n + 1);
                  setPaused(false);
                }}
              />
              <IconButton
                icon={paused ? "play" : "pause"}
                aria-label={paused ? "Продолжить" : "Пауза"}
                onClick={() => setPaused((p) => !p)}
              />
            </div>
          </div>
        </>
      )}

      {!filled && (
        <div className={styles.blank}>
          <Text variant="h3" tag="p">
            Описания пока нет
          </Text>
          <Text variant="body-sm" color="slate">
            Тренер или админ добавят его в разделе «Упражнения»
          </Text>
        </div>
      )}

      {comment && (
        <Card onClick={onOpenComments} className={styles.note}>
          <span className={styles.noteHead}>
            <span className={styles.avatar} aria-hidden="true">
              Т
            </span>
            <span className={styles.noteTitle}>
              <Text variant="body-sm" tag="span" className={styles.strong}>
                Комментарий тренера
              </Text>
              <Text variant="caption" tag="span">
                {[
                  formatCommentDate(comment.createdAt, now),
                  comment.video && `к видео: ${comment.video.label}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </span>
            {comment.isNew && <Badge>Новый</Badge>}
          </span>
          <span className={styles.noteText}>{comment.text}</span>
          <span className={styles.all}>
            Все комментарии · {commentsCount}
            <Icon name="chevronRight" size={20} />
          </span>
        </Card>
      )}

      {technique.instructions.length > 0 && (
        <section className={styles.how} aria-labelledby="how-title">
          <Text variant="eyebrow" id="how-title">
            Как выполнять
          </Text>
          <ol className={styles.steps}>
            {technique.instructions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {technique.mistake && (
            <p className={styles.mistake}>
              <Icon name="warning" size={20} className={styles.warn} />
              <span>Частая ошибка: {technique.mistake}</span>
            </p>
          )}
        </section>
      )}
    </>
  );
}
