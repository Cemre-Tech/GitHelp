import { t } from './i18n.mjs';
import { basename } from 'node:path';
import { UserError } from './git.mjs';

// Filename heuristics, deliberately not advertised as a complete secret scanner.
export function sensitivePath(path) {
  const name = basename(path.replaceAll('\\', '/')).toLowerCase();
  if (/^\.env(?:\.|$)/.test(name) && !/^\.env\.(?:example|sample|template)$/.test(name)) return true;
  return /\.(?:pem|p12|pfx|key|keystore)$/.test(name)
    || /^(?:id_rsa|id_ed25519|credentials(?:\.json)?|service[-_]?account.*\.json|\.npmrc|\.pypirc|\.netrc)$/.test(name);
}

export function selectFiles(answer, files) {
  if (['hepsi', 'all', '*'].includes(answer.toLowerCase())) return [...files];
  const tokens = answer.split(/[\s,]+/).filter(Boolean);
  if (!tokens.length || tokens.some(token => !/^\d+$/.test(token) || Number(token) < 1 || Number(token) > files.length)) {
    throw new UserError(t("Dosya numaralarını virgülle yaz: 1,3. Hepsini seçmek için: hepsi.", "Separate file numbers with commas: 1,3. To select every file, enter all."));
  }
  return [...new Set(tokens.map(Number))].map(index => files[index - 1]);
}

export function assertSafeFiles(files) {
  const blocked = files.filter(file => sensitivePath(file.path) || (file.originalPath && sensitivePath(file.originalPath)));
  if (blocked.length) throw new UserError(t(`Özel bilgi içerebilen dosyalar seçildi: ${blocked.map(file => file.path).join(', ')}. Bunları .gitignore dosyana ekle veya seçimden çıkar. Bu kontrol yalnızca dosya adlarına bakar.`, `Files that may contain private information were selected: ${blocked.map(file => file.path).join(', ')}. Add them to .gitignore or remove them from your selection. This check only looks at filenames.`));
  if (files.some(file => file.conflict)) throw new UserError(t("Çakışan dosyalar var. Önce dosyalardaki çakışmaları çöz.", "Some files have conflicts. Resolve them before continuing."));
}
