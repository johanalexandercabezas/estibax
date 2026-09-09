$s = 'c:\Users\Jcabezas\Downloads\SOLUCI~1\EstibaX\backend\prisma\schema.prisma'
Select-String -Path $s -Pattern 'model |enum ' | ForEach-Object { '{0}: {1}' -f $_.LineNumber, $_.Line }