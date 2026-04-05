import sys

from tui.app import AtbbsApp


def main():
    handle = sys.argv[1] if len(sys.argv) > 1 else None
    app = AtbbsApp(dial=handle)
    app.run()


if __name__ == "__main__":
    main()
