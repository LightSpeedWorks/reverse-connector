@set X_SVC="XReverseConnectorProxyService"
@set X_APP=node %~dp0reverse-connector\reverse-connector
@set X_NSSM=%~dp0nssm32
@if "%PROCESSOR_ARCHITECTURE%" == "AMD64" set X_NSSM=%~dp0nssm64
