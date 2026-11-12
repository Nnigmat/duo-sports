/** Slug упражнения, которому файл не дал id: браузер и сервер получают один и тот же, чтобы разминка ссылалась на него */
export const importSlug = (name: string): string => `my-${[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}`;
