// テスト → ビルド → dist/ を gh-pages ブランチに push して GitHub Pages に公開する
import { execSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

const remote = out('git remote get-url origin')
const repo = remote.replace(/\.git$/, '').split('/').pop()

run('npm test')
run('npm run build', { env: { ...process.env, BASE_PATH: `/${repo}/` } })
writeFileSync('dist/.nojekyll', '')
// vite build は dist/.git を残すので、毎回作り直す
rmSync('dist/.git', { recursive: true, force: true })

const git = (args) => run(`git ${args}`, { cwd: 'dist' })
git('init -q -b gh-pages')
git('add -A')
git(`-c user.name="${out('git config user.name')}" -c user.email="${out('git config user.email')}" commit -q -m "公開 ${new Date().toISOString()}"`)
git(`push -f -q ${remote} gh-pages`)
console.log(`\n公開しました（反映まで1〜2分かかります）`)
