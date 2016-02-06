@node -p '\x1b[33m'
@start node examples\target-example 33
@timeout /t 1 /nobreak > nul
@node -p '\x1b[33m'
@start node examples\server-example 33
@timeout /t 1 /nobreak > nul
@node -p '\x1b[32m'
@start node reverse\reverse 32
@timeout /t 1 /nobreak > nul
@node -p '\x1b[35m'
@start node proxy\proxy 35
@timeout /t 1 /nobreak > nul
@node -p '\x1b[36m'
@start node examples\client-example 36
