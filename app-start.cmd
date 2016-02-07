@node -p '\x1b[41m' & cls
@start examples\target-example
@timeout /t 1 /nobreak > nul
@start examples\server-example
@timeout /t 1 /nobreak > nul
@start reverse\reverse
@timeout /t 1 /nobreak > nul
@start proxy\proxy
@timeout /t 1 /nobreak > nul
@start examples\client-example
