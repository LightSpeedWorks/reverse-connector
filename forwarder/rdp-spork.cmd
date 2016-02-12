@node -p '\x1b[44m' & cls
@pushd %~dp0
@:loop
@node rdp-spork
@timeout /t 3 /nobreak
@node forwarder
@timeout /t 3 /nobreak
@goto loop
@popd
@pause
