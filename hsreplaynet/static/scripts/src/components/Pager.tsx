import * as React from "react";

interface Page {
	number?: number;
	active?: boolean;
	skip?: boolean;
}

interface PagerProps extends React.ClassAttributes<Pager> {
	currentPage?: number;
	setCurrentPage?: (page: number) => void;
	pageCount?: number;
}

export default class Pager extends React.Component<PagerProps, void> {

	render(): JSX.Element {
		if (this.props.pageCount <= 1) {
			return null;
		}

		const safeCurrentPage = this.getCurrentPage();

		const pages = [];
		let lastPage: number | null = null;
		for (let page of this.getPagesToShow()) {
			if (lastPage !== null && lastPage + 1 !== page) {
				pages.push({skip: true});
			}

			pages.push({
				number: page,
				active: page === +safeCurrentPage,
			});

			lastPage = page;
		}

		const makeOnClick = (pageNumber: number) => (e) => {
			e.preventDefault();
			this.props.setCurrentPage(pageNumber);
		};

		const previous = +safeCurrentPage - 1;
		const next = +safeCurrentPage + 1;

		const action = (targetPage: number, children: any, additionalProps?: any) => {
			const min = 1;
			const max = this.props.pageCount;

			let type = "span";

			const props = Object.assign({
				className: "weight-normal",
			}, additionalProps);

			if (targetPage >= min && targetPage <= max) {
				type = "a";
				props["href"] = "#page=" + targetPage;
				props["onClick"] = makeOnClick(targetPage);
			}

			return <li>{React.createElement(type, props, children)}</li>
		};

		return <nav className="btn-group">
			<ul className="pagination">
				{
					action(previous, [
						<span className="glyphicon glyphicon-arrow-left"></span>,
						<span className="hidden-lg">Previous</span>,
					], {title: "Previous page"})
				}
				{pages.map((page: Page) => {
					let content = null;
					const classNames = ["visible-lg-inline"];

					const pageNumber = page.number;

					if (page.skip) {
						content = <span className="transparent-background fixed-width weight-normal">…</span>;
					}
					else {
						content = (
							<a href={"#page=" + pageNumber} onClick={makeOnClick(pageNumber)} className="fixed-width">
								{pageNumber} {page.active ? <span className="sr-only">(current)</span> : null}
							</a>
						);
					}

					if (!content) {
						return null;
					}

					if (page.active) {
						classNames.push("active");
					}

					return (
						<li className={classNames.join(" ")}>
							{content}
						</li>
					);
				})}
				{<li className="hidden-lg">
					<span className="transparent-background weight-normal">{safeCurrentPage + " / " + this.props.pageCount}</span>
				</li>}
				{
					action(next, [
						<span className="hidden-lg">Next</span>,
						<span className="glyphicon glyphicon-arrow-right"></span>,
					], {title: "Next page"})
				}
			</ul>
		</nav>;
	}

	protected getCurrentPage(): number {
		const currentPage = +this.props.currentPage;
		if (isNaN(currentPage)) {
			return 1;
		}
		return Math.min(Math.max(currentPage, 1), this.props.pageCount);
	}

	protected getPagesToShow(): number[] {
		const min = 1;
		const max = this.props.pageCount;
		const range = 2;

		let pivot = Math.min(
			Math.max(this.getCurrentPage(), min + 2 * range + 1),
			max - 2 * range - 1,
		);

		// always show these pages
		const pages = [min];

		if(max > 1) {
			pages.push(min + 1);
		}

		if(max > 2) {
			pages.push(max);
		}

		if(max > 3) {
			pages.push(max - 1);
		}

		for (let page = min; page <= max; page++) {
			if (Math.abs(page - pivot) > range) {
				continue;
			}

			if (page < min || page > max) {
				continue;
			}

			if (pages.indexOf(page) !== -1) {
				continue;
			}

			pages.push(page);
		}

		pages.sort((a, b) => a - b);

		// fill any holes with a width of one page
		for (let i = 0; i < pages.length; i++) {
			const page = pages[i];
			if (pages.indexOf(page - 2) !== -1 && pages.indexOf(page - 1) === -1) {
				pages.splice(i, 0, page - 1);
			}
		}

		return pages;
	}
}
