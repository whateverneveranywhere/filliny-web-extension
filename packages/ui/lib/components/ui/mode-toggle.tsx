import { Moon, Sun, Monitor } from 'lucide-react';
import { DropdownMenuItem, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu';
import { useTheme } from './theme-provider';
import { Button } from './button';

export function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          {theme === 'dark' ? (
            <Moon className="filliny-h-[1.2rem] filliny-w-[1.2rem] filliny-transition-all" />
          ) : theme === 'system' ? (
            <Monitor className="filliny-h-[1.2rem] filliny-w-[1.2rem] filliny-transition-all" />
          ) : (
            <Sun className="filliny-h-[1.2rem] filliny-w-[1.2rem] filliny-transition-all" />
          )}
          <span className="filliny-sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
