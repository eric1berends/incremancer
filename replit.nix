{ pkgs }: {
  deps = [
    pkgs.python39Packages.flask
    pkgs.nodePackages.vscode-langservers-extracted
    pkgs.nodePackages.typescript-language-server  
  ];
}