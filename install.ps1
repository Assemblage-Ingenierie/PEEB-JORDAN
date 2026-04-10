$nodePath = 'C:\Program Files\nodejs'
$env:PATH = $nodePath + ';' + $env:PATH
Set-Location 'C:\Users\gesti\peeb-med-jordan'
& "$nodePath\npm.cmd" install
