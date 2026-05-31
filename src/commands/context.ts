import { setContextValue, getContext, clearContextValue } from '../config/store.js';
import { t, icons, divider } from '../ui/theme.js';
import { renderMiniSplash } from '../ui/splash.js';

export async function contextCommand(action: string, key?: string, value?: string): Promise<void> {
  renderMiniSplash();

  if (action === 'set') {
    if (!key || !value) {
      console.log(`\n  ${icons.cross}  ${t.error('Usage: polyp context set <key> <value>')}\n`);
      return;
    }
    setContextValue(key, value);
    console.log(`\n  ${icons.check}  ${t.success(`Context saved:`)} ${t.ocean(key)} = ${t.text(value)}\n`);
  } 
  else if (action === 'clear') {
    if (!key) {
      console.log(`\n  ${icons.cross}  ${t.error('Usage: polyp context clear <key>')}\n`);
      return;
    }
    clearContextValue(key);
    console.log(`\n  ${icons.check}  ${t.success(`Context cleared:`)} ${t.ocean(key)}\n`);
  } 
  else if (action === 'list') {
    const context = getContext();
    const keys = Object.keys(context);
    
    console.log(`\n  ${icons.brain}  ${t.heading('Persistent Context')}`);
    console.log(`  ${divider(40)}`);
    
    if (keys.length === 0) {
      console.log(`  ${t.dim('No context variables set.')}`);
      console.log(`  ${t.dim('Use:')} ${t.primary('polyp context set <key> <value>')}`);
    } else {
      for (const k of keys) {
        console.log(`  ${icons.bullet}  ${t.ocean(k)} ${t.dim('=')} ${t.text(context[k])}`);
      }
    }
    console.log('');
  } 
  else {
    console.log(`\n  ${icons.cross}  ${t.error('Unknown action.')} Use: set, clear, or list.\n`);
  }
}
