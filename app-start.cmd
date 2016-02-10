@pushd %~dp0
@node -p '\x1b[41m' & cls
@echo starting target-example...
@start examples\target-example
@timeout /t 1 /nobreak > nul
@echo starting server-example...
@start examples\server-example
@timeout /t 1 /nobreak > nul
@echo starting proxy...
@start proxy\proxy
@timeout /t 1 /nobreak > nul
@echo starting connector...
@start connector\connector
@timeout /t 1 /nobreak > nul
@echo starting client-example...
@start examples\client-example
@timeout /t 5 /nobreak > nul
@popd
