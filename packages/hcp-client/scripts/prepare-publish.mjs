import shell from 'shelljs'

async function main() {
  shell.mkdir('-p', '_tmp')
  shell.cp('-rf', 'dist', '_tmp/')
  shell.cp('.npmrc', '_tmp/')

  const json = JSON.parse(shell.cat('package.json').toString())
  delete json['devDependencies']
  delete json['scripts']
  shell.echo(JSON.stringify(json, null, 2)).to('_tmp/package.json')
}

main()
