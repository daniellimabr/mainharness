# Pedido ao harness: pre-bash: bloquear ssh/scp/sftp direto por regra do projeto (claude-local.md)

- **Projeto:** financeiro
- **Data:** 2026-11-07
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

O hook pre-bash (e o equivalente do PowerShell, se existir) deve negar comandos que invoquem os binários ssh, scp, sftp ou ssh.exe diretamente, quando o repo tiver um claude-local.md com a regra. Mecanismo sugerido, genérico e não só do financeiro: o projeto declara em um arquivo de config (ex.: .harness/local-rules.json ou seção no claude-local.md) uma lista de comandos proibidos com a mensagem de orientação; o pre-bash lê e nega com a mensagem. Para o financeiro: proibir ssh/scp/sftp/ssh.exe e orientar 'use .\scripts\ssh-vm.ps1 dev "comando" (paramiko)'. Não deve bloquear o wrapper (python scripts/ssh_vm.py e ssh-vm.ps1), nem texto que apenas cite ssh em mensagem de commit, grep ou doc. Cobrir tanto a ferramenta Bash quanto a PowerShell. O attach deve criar essa config a partir das regras legadas encontradas (ligação com o pedido de attach do mesmo dia).

## Por quê

No repo financeiro a política de TI do notebook corporativo proíbe ssh/scp direto; só paramiko via wrapper. Hoje a regra é só texto em claude-local.md e depende de a sessão obedecer. Daniel quer trava técnica no pre-bash, pois já houve falha: a regra se perdeu no attach e o Tech Lead chegou a recomendar ssh.exe.

## Exemplo

—
