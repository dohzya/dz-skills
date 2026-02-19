class Wl < Formula
  desc "Worklog - track work progress during development sessions"
  homepage "https://github.com/dohzya/tools"
  version "0.8.1"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.8.1/wl-darwin-arm64"
      sha256 "84233cbc6f4cfe87396b960cd555f5b1b6114a7be89e292fa59c49dee6727c67"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.8.1/wl-darwin-x86_64"
      sha256 "b77ef9ce57aa1083e8a2850876fdf9389dcf1358e51d87af07a2f982381d21ce"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.8.1/wl-linux-arm64"
      sha256 "5c2756e55808c892c1d7f68a5d3311ceb9102aebffe64c77531ff076e60c059f"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/tools/releases/download/wl-v0.8.1/wl-linux-x86_64"
      sha256 "c763360982e536f8e13f2c54665fc2a398c1bf664c0c364d8122f351e5420bdb"
    end
  end

  def install
    # Determine which binary was downloaded based on platform
    binary_name = if OS.mac?
      if Hardware::CPU.arm?
        "wl-darwin-arm64"
      else
        "wl-darwin-x86_64"
      end
    else
      if Hardware::CPU.arm?
        "wl-linux-arm64"
      else
        "wl-linux-x86_64"
      end
    end

    bin.install binary_name => "wl"
  end

  test do
    system "#{bin}/wl", "--help"
  end
end
