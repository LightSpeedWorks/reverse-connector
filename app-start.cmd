@node -p '\x1b[33m'
@start /b node examples\target-example 33
@timeout /t 1 /nobreak > nul
@node -p '\x1b[33m'
@start /b node examples\server-example 33
@timeout /t 1 /nobreak > nul
@node -p '\x1b[32m'
@start /b node reverse\reverse 32
@timeout /t 1 /nobreak > nul
@node -p '\x1b[35m'
@start /b node proxy\proxy 35
@timeout /t 1 /nobreak > nul
@node -p '\x1b[36m'
@start /b node examples\client-example 36
